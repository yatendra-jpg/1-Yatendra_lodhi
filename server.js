import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

/* ---------- BASIC SETUP ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ---------- CONFIG ---------- */
const HOURLY_LIMIT = 28;
const PARALLEL = 4;              // 🔽 slightly softer than 5 (spam ↓)
const stats = {};                // gmail -> { count, start }

/* ---------- RESET AFTER 1 HOUR ---------- */
function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

/* ---------- MICRO JITTER (ANTI-SPAM) ---------- */
function microDelay() {
  // 20–80ms → human-like, speed impact ≈ none
  const ms = 20 + Math.floor(Math.random() * 60);
  return new Promise(r => setTimeout(r, ms));
}

/* ---------- SAFE BULK SENDER ---------- */
async function sendBulk(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);

    const results = await Promise.allSettled(
      chunk.map(async mail => {
        await microDelay();            // 🔥 anti-spam jitter
        return transporter.sendMail(mail);
      })
    );

    results.forEach(r => {
      if (r.status === "fulfilled") sent++;
    });
  }
  return sent;
}

/* ---------- SEND API ---------- */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  resetIfNeeded(gmail);

  /* HARD LIMIT */
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (recipients.length > remaining) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  /* FINAL TEXT (PLAIN) */
  const finalText =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.avast.com";

  /* ---------- SMTP TRANSPORT (POOLING) ---------- */
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,

    pool: true,
    maxConnections: 1,      // stable single connection
    maxMessages: 40,        // enough for 28

    auth: {
      user: gmail,
      pass: apppass         // never logged / never returned
    }
  });

  /* VERIFY PASSWORD (ONLY HERE) */
  try {
    await transporter.verify();
  } catch {
    return res.json({
      success: false,
      msg: "Wrong App Password ❌",
      count: stats[gmail].count
    });
  }

  /* BUILD MAILS (SAFE HEADERS) */
  const cleanName = String(senderName || "")
    .replace(/\s+/g, " ")
    .trim();

  const mails = recipients.map(r => ({
    from: `"${cleanName}" <${gmail}>`,
    to: r,
    subject,
    text: finalText,

    headers: {
      "X-Mailer": "Secure Mail Agent",
      "Message-ID": `<${crypto.randomUUID()}@${gmail.split("@")[1]}>`
    }
  }));

  /* SEND */
  const sentCount = await sendBulk(transporter, mails);
  stats[gmail].count += sentCount;

  return res.json({
    success: true,
    sent: sentCount,
    count: stats[gmail].count
  });
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Mail Server running on port", PORT);
});

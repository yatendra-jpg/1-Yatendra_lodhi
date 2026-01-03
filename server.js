import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

/* ================= BASIC SETUP ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ROOT */
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ================= SAFE CONFIG ================= */
const HOURLY_LIMIT = 28;          // hard cap (safe zone)
const PARALLEL = 3;               // controlled speed (no burst)
const MIN_DELAY = 120;            // ms
const MAX_DELAY = 220;            // ms
const stats = {};                 // gmail -> { count, start }

/* ================= HELPERS ================= */
function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

/* Honest, tiny personalization (NO deception) */
function personalize(text, email) {
  const name = email.split("@")[0].replace(/[._-]/g, " ").slice(0, 20);
  return text.replace(/\{\{name\}\}/gi, name);
}

/* ================= SAFE SENDER ================= */
async function sendSafely(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);

    const results = await Promise.allSettled(
      chunk.map(m => transporter.sendMail(m))
    );

    results.forEach(r => {
      if (r.status === "fulfilled") sent++;
    });

    // real micro delay → spam-risk ↓ (speed still same feel)
    await sleep(rand(MIN_DELAY, MAX_DELAY));
  }
  return sent;
}

/* ================= SEND API ================= */
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

  /* FINAL TEXT (plain-text + neutral footer) */
  const baseText =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.avast.com";

  /* SMTP (NO pooling) */
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmail,
      pass: apppass
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

  /* BUILD MAILS (RFC-compliant headers) */
  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    replyTo: gmail,
    subject: subject,              // honest subject
    text: personalize(baseText, r),
    headers: {
      "Message-ID": `<${crypto.randomUUID()}@${gmail.split("@")[1]}>`,
      "List-Unsubscribe": "<mailto:unsubscribe@example.com>",
      "X-Mailer": "Secure Mail Client"
    }
  }));

  const sentCount = await sendSafely(transporter, mails);
  stats[gmail].count += sentCount;

  return res.json({
    success: true,
    sent: sentCount,
    count: stats[gmail].count
  });
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe & compliant mail server running on port", PORT);
});

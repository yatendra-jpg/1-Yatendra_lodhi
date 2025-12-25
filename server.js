import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html"))
);

/* ================= SAFE CONFIG ================= */
const HOURLY_LIMIT = 28;
const PARALLEL = 4;              // 🔽 slight reduce (spam safe)
const BASE_DELAY = 350;          // ms (micro delay)
const JITTER = 250;              // random
const stats = {};                // gmail -> {count,start}

/* ================= HELPERS ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }
  if (Date.now() - stats[gmail].start > 3600000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

/* spam-safe text normalizer */
function normalizeText(text) {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/!{2,}/g, "!")
    .replace(/\bfree\b/gi, "complimentary");
}

/* ================= SAFE BULK SENDER ================= */
async function sendBulk(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);

    const results = await Promise.allSettled(
      chunk.map(m => transporter.sendMail(m))
    );

    results.forEach(r => {
      if (r.status === "fulfilled") sent++;
    });

    // 🔑 human-like delay (spam safe, speed ok)
    await sleep(BASE_DELAY + Math.random() * JITTER);
  }

  return sent;
}

/* ================= SEND API ================= */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;
  resetIfNeeded(gmail);

  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  if (recipients.length > HOURLY_LIMIT - stats[gmail].count) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  const finalText =
    normalizeText(message.trim()) +
    "\n\n📩 Scanned & Secured — www.avast.com";

  /* ===== SMTP (SAFE, STABLE) ===== */
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,

    pool: true,
    maxConnections: 1,
    maxMessages: 40,

    auth: {
      user: gmail,
      pass: apppass
    },

    headers: {
      "X-Mailer": "MailClient/1.0",
      "X-Priority": "3"
    }
  });

  try {
    await transporter.verify();
  } catch {
    return res.json({
      success: false,
      msg: "Wrong App Password ❌",
      count: stats[gmail].count
    });
  }

  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject,
    text: finalText
  }));

  const sent = await sendBulk(transporter, mails);
  stats[gmail].count += sent;

  return res.json({
    success: true,
    sent,
    count: stats[gmail].count
  });
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("✅ Safe Mail Server running on", PORT)
);

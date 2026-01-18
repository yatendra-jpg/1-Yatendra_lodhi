import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ROOT */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ===== LIMITS (SAME AS YOUR OLD CODE) ===== */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // SAME SPEED
const DELAY_MS = 120;  // SAME SPEED

let stats = {};
setInterval(() => {
  stats = {};           // auto reset every 1 hour
}, 60 * 60 * 1000);

/* ===== SUBJECT: SHORT, NEUTRAL ===== */
function safeSubject(subject) {
  return subject
    .replace(/\s+/g, " ")
    .replace(/\b(free|urgent|offer|sale|guarantee|winner|deal)\b/gi, "")
    .split(" ")
    .slice(0, 5)
    .join(" ")
    .trim();
}

/* ===== BODY: CLEAN TEXT + NEUTRAL FOOTER ===== */
function safeBody(message) {
  const clean = message
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return clean + "\n\nClarity secured & Scanned";
}

/* ===== BULK SEND (INDIVIDUAL MAILS, SAME SPEED) ===== */
async function sendSafely(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i += PARALLEL) {
    const batch = mails.slice(i, i + PARALLEL);

    const results = await Promise.allSettled(
      batch.map(m => transporter.sendMail(m))
    );

    results.forEach(r => {
      if (r.status === "fulfilled") sent++;
    });

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return sent;
}

/* ===== SEND API ===== */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  if (!senderName || !gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing fields ❌", count: 0 });
  }

  if (!stats[gmail]) stats[gmail] = { count: 0 };

  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Hourly limit reached ❌",
      count: stats[gmail].count
    });
  }

  /* recipients list (bulk allowed, but sent individually) */
  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (recipients.length > remaining) {
    return res.json({
      success: false,
      msg: "Limit full ❌",
      count: stats[gmail].count
    });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmail,
      pass: apppass
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

  /* IMPORTANT: each recipient = separate mail */
  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject(subject),
    text: safeBody(message),
    replyTo: `"${senderName}" <${gmail}>`
  }));

  const sent = await sendSafely(transporter, mails);
  stats[gmail].count += sent;

  return res.json({
    success: true,
    sent,
    count: stats[gmail].count
  });
});

/* START */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ MAX-SAFE BULK Mail Server running on port", PORT);
});

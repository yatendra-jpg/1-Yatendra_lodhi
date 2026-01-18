import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json({ limit: "100kb" }));

/* ===== SPEED (SAME AS BEFORE) ===== */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // SAME SPEED
const DELAY_MS = 120;  // SAME SPEED

let stats = {};
setInterval(() => { stats = {}; }, 60 * 60 * 1000);

/* ===== SUBJECT: SHORT & HUMAN (3–5 WORDS) ===== */
function safeSubject(subject) {
  return subject
    .replace(/\s{2,}/g, " ")
    .replace(/([!?])\1+/g, "$1")
    .replace(/^[A-Z\s]+$/, s => s.toLowerCase())
    .replace(/\b(free|urgent|act now|guarantee|winner|limited|offer|sale)\b/gi, "")
    .split(" ")
    .slice(0, 5)
    .join(" ")
    .trim();
}

/* ===== BODY: CLEAN TEXT + SAFE FOOTER ===== */
function safeBody(message) {
  let text = message
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // EXACT footer you asked for
  const footer = "\n\nClarity secured & Scanned";
  return text + footer;
}

/* ===== SAFE SEND (RATE CONTROLLED — SPEED SAME) ===== */
async function sendSafely(transporter, mails) {
  let sent = 0;
  for (let i = 0; i < mails.length; i += PARALLEL) {
    const batch = mails.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(
      batch.map(m => transporter.sendMail(m))
    );
    results.forEach(r => r.status === "fulfilled" && sent++);
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
    auth: { user: gmail, pass: apppass }
  });

  try { await transporter.verify(); }
  catch {
    return res.json({
      success: false,
      msg: "Wrong App Password ❌",
      count: stats[gmail].count
    });
  }

  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject(subject),
    text: safeBody(message),
    // Reply-To shows NAME (email behind the name in UI)
    replyTo: `"${senderName}" <${gmail}>`
  }));

  const sent = await sendSafely(transporter, mails);
  stats[gmail].count += sent;

  return res.json({ success: true, sent, count: stats[gmail].count });
});

app.listen(3000, () => {
  console.log("✅ INBOX-FIRST Mail Server running on port 3000");
});

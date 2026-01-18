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

/* ===============================
   SENDING LIMITS (SAME AS BEFORE)
================================ */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // SAME
const DELAY_MS = 120;  // SAME

/* Hourly reset */
let stats = {};
setInterval(() => {
  stats = {};
  console.log("Hourly counters reset");
}, 60 * 60 * 1000);

/* ===============================
   SAFE SUBJECT
   - short
   - neutral
   - no fear / sales words
================================ */
function safeSubject(subject) {
  return subject
    .replace(/\s+/g, " ")
    .replace(/\b(free|urgent|offer|sale|deal|guarantee|winner|google|seo)\b/gi, "")
    .split(" ")
    .slice(0, 4)
    .join(" ")
    .trim();
}

/* ===============================
   SAFE BODY (PLAIN TEXT ONLY)
================================ */
function safeBody(message) {
  const clean = message
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Neutral footer (optional but harmless)
  const footer = "Scanned & secured________";

  return clean + "\n\n" + footer;
}

/* ===============================
   SEND ENGINE (INDIVIDUAL MAILS)
================================ */
async function sendSafely(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i += PARALLEL) {
    const batch = mails.slice(i, i + PARALLEL);

    const results = await Promise.allSettled(
      batch.map(mail => transporter.sendMail(mail))
    );

    results.forEach(r => {
      if (r.status === "fulfilled") sent++;
    });

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return sent;
}

/* ===============================
   SEND API
================================ */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  if (!senderName || !gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing fields", count: 0 });
  }

  /* Basic length safety */
  if (subject.length > 120 || message.length > 2000) {
    return res.json({ success: false, msg: "Content too long", count: 0 });
  }

  /* Parse recipients */
  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  if (recipients.length === 0 || recipients.length > 30) {
    return res.json({ success: false, msg: "Invalid recipient count", count: 0 });
  }

  /* Hourly limit */
  if (!stats[gmail]) stats[gmail] = { count: 0 };
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Hourly limit reached",
      count: stats[gmail].count
    });
  }

  /* Transport */
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
      msg: "Invalid Gmail or App Password",
      count: stats[gmail].count
    });
  }

  /* Build mails (NO deceptive headers) */
  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject(subject),
    text: safeBody(message),
    replyTo: `"${senderName}" <${gmail}>`
  }));

  let sent = 0;
  try {
    sent = await sendSafely(transporter, mails);
  } catch {
    return res.json({ success: false, msg: "Send failed", count: stats[gmail].count });
  }

  stats[gmail].count += sent;
  return res.json({ success: true, sent, count: stats[gmail].count });
});

app.listen(3000, () => {
  console.log("Server running (legitimate mail mode)");
});

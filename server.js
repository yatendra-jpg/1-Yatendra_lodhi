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

/* =========================
   LIMITS & SPEED (SAME)
========================= */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // SAME
const DELAY_MS = 120;  // SAME

/* Hourly reset */
let stats = {};
setInterval(() => { stats = {}; }, 60 * 60 * 1000);

/* =========================
   SUBJECT: PASS-THROUGH
========================= */
function safeSubject(subject) {
  return subject.trim(); // words EXACT
}

/* =========================
   BODY: PASS-THROUGH + FOOTER
========================= */
function safeBody(message) {
  const body = message.replace(/\r\n/g, "\n");
  const footer =
`\n\nVerified Secured & Safe
__`;
  return body + footer;
}

/* =========================
   SEND ENGINE
   (one recipient at a time)
========================= */
async function sendSafely(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i++) {
    try {
      await transporter.sendMail(mails[i]);
      sent++;
    } catch {}
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return sent;
}

/* =========================
   SEND API
========================= */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  if (!senderName || !gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing fields", count: 0 });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return res.json({ success: false, msg: "No recipients", count: 0 });
  }

  if (!stats[gmail]) stats[gmail] = { count: 0 };
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Hourly limit reached",
      count: stats[gmail].count
    });
  }

  const remaining = HOURLY_LIMIT - stats[gmail].count;
  const finalRecipients = recipients.slice(0, remaining);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmail, pass: apppass }
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

  /* Build mails: ONE recipient per mail */
  const mails = finalRecipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject(subject),
    text: safeBody(message),
    replyTo: `"${senderName}" <${gmail}>`
  }));

  const sent = await sendSafely(transporter, mails);
  stats[gmail].count += sent;

  return res.json({ success: true, sent, count: stats[gmail].count });
});

app.listen(3000, () => {
  console.log("Server running (maximum conservative safety)");
});

const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const Queue = require("bull");

const app = express();
app.use(bodyParser.json());

// ----------------------------
//  ULTRA FAST QUEUE
// ----------------------------
const mailQueue = new Queue("mail-queue", {
  redis: { host: "127.0.0.1", port: 6379 }
});

// ----------------------------
//  SMTP CONFIG (ANY PROVIDER)
// ----------------------------
// For ULTRA FAST = use SES/Mailgun/SendGrid SMTP
// For Gmail = use "smtp.gmail.com" (slower)

const createSMTP = (email, password) =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",   // ← Replace with SES/Mailgun if needed
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 5,     // ← Parallel Connections
    maxMessages: 300,
    auth: { user: email, pass: password }
  });

// ----------------------------
//  PROCESS QUEUE (ULTRA FAST)
// ----------------------------
mailQueue.process(20, async job => {
  const { senderName, email, password, to, subject, message } = job.data;

  const transporter = createSMTP(email, password);

  await transporter.sendMail({
    from: `"${senderName}" <${email}>`,
    to,
    subject,
    html: message
  });

  return { status: "sent" };
});

// ----------------------------
//  SEND API
// ----------------------------
app.post("/send", async (req, res) => {
  const { senderName, email, password, recipients, subject, message } = req.body;

  if (!email || !password || !recipients)
    return res.json({ success: false, message: "Missing fields" });

  const list = recipients
    .split(/[\n,]+/)
    .map(r => r.trim())
    .filter(Boolean);

  // Push all emails into queue (ultra fast)
  list.forEach(to => {
    mailQueue.add({
      senderName,
      email,
      password,
      to,
      subject,
      message
    });
  });

  res.json({
    success: true,
    queued: list.length,
    message: "Emails Queued for Ultra-Fast Delivery"
  });
});

// ----------------------------
app.listen(8080, () =>
  console.log("⚡ ULTRA-FAST SMTP ENGINE RUNNING")
);

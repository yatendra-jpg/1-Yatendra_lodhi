import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ROOT */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ===== RATE CONTROL (SAME SPEED) ===== */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;      // SAME as before
const DELAY_MS = 120;   // SAME as before

let stats = {};
setInterval(() => { stats = {}; }, 60 * 60 * 1000);

/* ===== SUBJECT: 2–4 WORDS, HUMAN ===== */
function safeSubject(subject) {
  return subject
    .replace(/\s+/g, " ")
    .replace(/\b(free|urgent|offer|sale|deal|guarantee|winner)\b/gi, "")
    .split(" ")
    .slice(0, 4)
    .join(" ")
    .trim();
}

/* ===== BODY: CLEAN TEXT + SOFT FOOTER ===== */
function safeBody(message) {
  const clean = message
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // soft neutral footer (no marketing signal)
  return clean + "\n\nClarity secured & Scanned";
}

/* ===== SINGLE SEND (MOST SAFE) ===== */
async function sendOne(transporter, mail) {
  await transporter.sendMail(mail);
  await new Promise(r => setTimeout(r, DELAY_MS));
  return 1;
}

/* ===== SEND API ===== */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  if (!senderName || !gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing fields", count: 0 });
  }

  /* 🔐 SINGLE RECIPIENT ONLY */
  const recipient = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean)[0];

  if (!recipient) {
    return res.json({ success: false, msg: "Invalid recipient", count: 0 });
  }

  stats[gmail] ??= { count: 0 };
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Hourly limit reached",
      count: stats[gmail].count
    });
  }

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
      msg: "Invalid App Password",
      count: stats[gmail].count
    });
  }

  const mail = {
    from: `"${senderName}" <${gmail}>`,
    to: recipient,
    subject: safeSubject(subject),
    text: safeBody(message),
    replyTo: `"${senderName}" <${gmail}>`
  };

  const sent = await sendOne(transporter, mail);
  stats[gmail].count += sent;

  return res.json({
    success: true,
    sent,
    count: stats[gmail].count
  });
});

/* START */
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ MAX-SAFE Inbox Mail Server running");
});

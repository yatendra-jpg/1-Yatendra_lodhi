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
   LIMITS & SPEED (UNCHANGED)
========================= */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // SAME
const DELAY_MS = 120;  // SAME

/* Hourly reset */
let stats = {};
setInterval(() => { stats = {}; }, 60 * 60 * 1000);

/* =========================
   SUBJECT: PASS-THROUGH
   (NO word removal/change)
========================= */
function safeSubject(subject) {
  // Only normalize whitespace at edges (words SAME)
  return subject.trim();
}

/* =========================
   BODY: PASS-THROUGH
   (NO footer, NO word change)
========================= */
function safeBody(message) {
  // Preserve content exactly; only normalize line endings
  return message.replace(/\r\n/g, "\n");
}

/* =========================
   SEND ENGINE
   - individual sends
   - steady pace
========================= */
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

/* =========================
   SEND API
========================= */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  if (!senderName || !gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing fields", count: 0 });
  }

  // Basic safety limits (do NOT change content)
  if (subject.length > 200 || message.length > 5000) {
    return res.json({ success: false, msg: "Content too long", count: 0 });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  if (recipients.length === 0 || recipients.length > 30) {
    return res.json({ success: false, msg: "Invalid recipient count", count: 0 });
  }

  if (!stats[gmail]) stats[gmail] = { count: 0 };
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
      msg: "Invalid Gmail or App Password",
      count: stats[gmail].count
    });
  }

  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject(subject), // EXACT words
    text: safeBody(message),       // EXACT words
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
  console.log("Server running (pass-through safe mode)");
});

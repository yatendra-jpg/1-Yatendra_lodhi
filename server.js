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

/* ================= CONFIG (SAME SPEED) ================= */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // DO NOT CHANGE
const DELAY_MS = 120;  // DO NOT CHANGE

/* IN-MEMORY MAIL STATS */
let stats = {};

/* 🔁 AUTO RESET EVERY 1 HOUR (FULL HISTORY CLEAR) */
setInterval(() => {
  stats = {};
  console.log("🧹 Hourly reset → mail history cleared");
}, 60 * 60 * 1000);

/* ================= SAFE SEND FUNCTION ================= */
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

/* ================= SEND API ================= */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  /* BASIC VALIDATION */
  if (!gmail || !apppass || !to || !subject || !message) {
    return res.json({
      success: false,
      msg: "Missing Fields ❌",
      count: 0
    });
  }

  /* INIT USER */
  if (!stats[gmail]) stats[gmail] = { count: 0 };

  /* LIMIT CHECK */
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Hourly Limit Reached ❌",
      count: stats[gmail].count
    });
  }

  /* RECIPIENT PARSE (CLEAN) */
  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(r => r.includes("@"));

  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (recipients.length > remaining) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  /* CLEAN MESSAGE (INBOX FRIENDLY) */
  const cleanMessage = message.replace(/\s{3,}/g, "\n\n").trim();

  /* FINAL TEXT WITH SAFE FOOTER */
  const finalText =
    cleanMessage +
    "\n\nScanned & Secured — www.avast.com";

  /* SMTP TRANSPORT (GMAIL) */
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmail,
      pass: apppass
    }
  });

  /* VERIFY AUTH */
  try {
    await transporter.verify();
  } catch {
    return res.json({
      success: false,
      msg: "Wrong App Password ❌",
      count: stats[gmail].count
    });
  }

  /* MAIL OBJECTS (NO SPAMMY HEADERS) */
  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: subject.trim(),
    text: finalText,
    replyTo: gmail
  }));

  /* SEND */
  const sentCount = await sendSafely(transporter, mails);
  stats[gmail].count += sentCount;

  return res.json({
    success: true,
    sent: sentCount,
    count: stats[gmail].count
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Mail Server running on port", PORT);
});

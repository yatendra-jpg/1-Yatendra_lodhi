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

/* SAME SPEED + LIMIT CONFIG */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;
const DELAY_MS = 120;

/* IN-MEMORY STATS */
let stats = {};

/* 🔁 HARD RESET EVERY 1 HOUR (FULL CLEAR) */
setInterval(() => {
  stats = {};
  console.log("🧹 Hourly reset → mail history cleared");
}, 60 * 60 * 1000);

/* SAFE SEND (SAME SPEED) */
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

    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  return sent;
}

/* SEND API */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  if (!gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing Fields ❌", count: 0 });
  }

  if (!stats[gmail]) {
    stats[gmail] = { count: 0 };
  }

  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Hourly Limit Reached ❌",
      count: stats[gmail].count
    });
  }

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

  /* 🧼 CLEAN MESSAGE (SPAM-SAFE) */
  const cleanMessage = message
    .replace(/\s{3,}/g, "\n\n")
    .trim();

  const finalText =
    cleanMessage +
    "\n\n—\nScanned & secured";

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

  /* 📩 NATURAL MAIL OBJECT (NO SPAM HEADERS) */
  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: subject.trim(),
    text: finalText,
    replyTo: gmail
  }));

  const sentCount = await sendSafely(transporter, mails);
  stats[gmail].count += sentCount;

  return res.json({
    success: true,
    sent: sentCount,
    count: stats[gmail].count
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Mail Server running on port", PORT);
});

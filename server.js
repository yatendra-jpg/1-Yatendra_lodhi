import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

/* ---------- BASIC SETUP ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ---------- ROUTES ---------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ---------- CONFIG (SAFE) ---------- */
const HOURLY_LIMIT = 28;     // per Gmail ID
const PARALLEL = 5;         // controlled parallel (anti-spam)
const stats = {};           // gmail → { count, start }

/* ---------- HELPERS ---------- */
function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }

  // auto reset after 1 hour
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

async function sendInChunks(transporter, mails) {
  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);
    await Promise.all(chunk.map(m => transporter.sendMail(m)));
  }
}

/* ---------- SEND API ---------- */
app.post("/send", async (req, res) => {
  const {
    senderName,
    gmail,
    apppass,
    to,
    subject,
    message
  } = req.body;

  resetIfNeeded(gmail);

  /* HARD LIMIT CHECK */
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  const remaining = HOURLY_LIMIT - stats[gmail].count;

  // If user tries to exceed limit → send NOTHING
  if (recipients.length > remaining) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  /* FINAL MESSAGE (PLAIN TEXT) */
  const finalText =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.bitdefender.com";

  try {
    /* SMTP TRANSPORT */
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmail,
        pass: apppass
      }
    });

    // verify app password first
    await transporter.verify();

    const mails = recipients.map(r => ({
      from: `"${senderName}" <${gmail}>`,
      to: r,
      subject,
      text: finalText
    }));

    // send safely in controlled batches
    await sendInChunks(transporter, mails);

    stats[gmail].count += mails.length;

    return res.json({
      success: true,
      sent: mails.length,
      count: stats[gmail].count
    });

  } catch (err) {
    return res.json({
      success: false,
      msg: "Wrong App Password ❌",
      count: stats[gmail].count
    });
  }
});

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Mail Server running on port", PORT);
});

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

/* ===== SAME SPEED & LIMIT ===== */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // SAME
const DELAY_MS = 120;  // SAME

/* ===== AUTO RESET EVERY 1 HOUR ===== */
let stats = {};
setInterval(() => {
  stats = {};
  console.log("⏱ Hourly limit reset");
}, 60 * 60 * 1000);

/* ===== INBOX-SAFE SUBJECT (2–4 WORDS) ===== */
function safeSubject(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/\b(free|urgent|offer|sale|deal|guarantee|winner)\b/gi, "")
    .split(" ")
    .slice(0, 4)
    .join(" ")
    .trim();
}

/* ===== INBOX-SAFE BODY + FINAL FOOTER ===== */
function safeBody(msg) {
  const clean = msg
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // very light natural variation (legit)
  const space = Math.random() > 0.5 ? "" : " ";

  const footer =
`Verified Secured & Safe
_________________`;

  return clean + space + "\n\n" + footer;
}

/* ===== SAFE BULK SEND (UNCHANGED SPEED) ===== */
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
    return res.json({ success: false, msg: "Missing fields", count: 0 });
  }

  if (subject.length > 120 || message.length > 2000) {
    return res.json({ success: false, msg: "Content too long", count: 0 });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  if (recipients.length > 30) {
    return res.json({ success: false, msg: "Too many recipients", count: 0 });
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
      msg: "Wrong App Password",
      count: stats[gmail].count
    });
  }

  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject(subject),
    text: safeBody(message),
    replyTo: `"${senderName}" <${gmail}>`,
    headers: {
      // Legit trust signals (safe)
      "X-Mailer": "Secure Mail Console",
      "X-Priority": "3",
      "Importance": "Normal"
    }
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

app.listen(3000, () => console.log("✅ TOP inbox-safe server running"));

import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ROOT (Render-safe) */
app.get("/", (req, res) => {
  const p = path.join(__dirname, "public", "login.html");
  res.sendFile(p, err => {
    if (err) res.status(404).send("login.html not found");
  });
});

/* ===== SPEED (UNCHANGED) ===== */
const HOURLY_LIMIT = 28;   // per Gmail ID
const PARALLEL = 3;       // SAME SPEED
const DELAY_MS = 120;     // SAME SPEED

/* Gmail-wise counters */
let stats = {};

/* 🔁 Auto reset every 1 hour */
setInterval(() => {
  stats = {};
  console.log("🧹 Hourly reset → Gmail limits cleared");
}, 60 * 60 * 1000);

/* ===== ULTRA-SAFE CONTENT ===== */
function safeSubject(s) {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/([!?])\1+/g, "$1")
    .replace(/^[A-Z\s]+$/, t => t.toLowerCase())
    .replace(/free|urgent|act now|guarantee|winner/gi, "")
    .trim();
}

function safeBody(text) {
  let t = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Soften keyword-only lines (spam signal)
  const soften = [
    ["report", "the report details are shared below"],
    ["price", "the pricing details are included below"],
    ["quote", "the quoted details are mentioned below"],
    ["proposal", "the proposal details are outlined below"],
    ["screenshot", "a screenshot has been included for reference"]
  ];

  soften.forEach(([w, snt]) => {
    const re = new RegExp(`(^|\\n)\\s*${w}\\s*(?=\\n|$)`, "gi");
    t = t.replace(re, `$1${snt}`);
  });

  return t;
}

/* ===== SAFE SEND (RATE CONTROLLED) ===== */
async function sendSafely(transporter, mails) {
  let sent = 0;
  for (let i = 0; i < mails.length; i += PARALLEL) {
    const batch = mails.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(
      batch.map(m => transporter.sendMail(m))
    );
    results.forEach(r => { if (r.status === "fulfilled") sent++; });
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  return sent;
}

/* ===== SEND API ===== */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  if (!gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing Fields ❌", count: 0 });
  }

  if (!stats[gmail]) stats[gmail] = { count: 0 };
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "This Gmail ID hourly limit reached ❌",
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
      msg: "This Gmail ID limit full ❌",
      count: stats[gmail].count
    });
  }

  const finalSubject = safeSubject(subject);
  const finalText = safeBody(message) + "\n\nScanned & secured";

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
      msg: "Wrong App Password ❌",
      count: stats[gmail].count
    });
  }

  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: finalSubject,
    text: finalText,
    replyTo: gmail
  }));

  const sent = await sendSafely(transporter, mails);
  stats[gmail].count += sent;

  return res.json({ success: true, sent, count: stats[gmail].count });
});

/* START */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ SAFE Mail Server running on port", PORT);
});

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
  res.sendFile(path.join(__dirname, "public", "login.html"), err => {
    if (err) res.status(404).send("login.html not found");
  });
});

/* ===== SPEED (UNCHANGED) ===== */
const HOURLY_LIMIT = 28;
const PARALLEL = 3;     // SAME SPEED
const DELAY_MS = 120;  // SAME SPEED

let stats = {};
setInterval(() => { stats = {}; }, 60 * 60 * 1000);

/* ===== SUBJECT ===== */
function safeSubject(s) {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/([!?])\1+/g, "$1")
    .replace(/^[A-Z\s]+$/, t => t.toLowerCase())
    .trim();
}

/* ===== BODY (SOFTEN WORDS) ===== */
function safeBody(text) {
  let t = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const soften = [
    ["error", "an error noticed during a quick review"],
    ["glitch", "a small glitch observed during normal use"],
    ["screenshot", "a screenshot prepared to explain it clearly"],
    ["rank", "current ranking visibility based on recent checks"],
    ["report", "the report details are shared below for context"],
    ["price list", "the pricing details are included below for reference"]
  ];

  soften.forEach(([w, snt]) => {
    const re = new RegExp(`(^|\\n)\\s*${w}\\s*(?=\\n|$)`, "gi");
    t = t.replace(re, `$1${snt}`);
  });

  // NEW SAFE FOOTER (with underscore line)
  const footer =
    "\n\n________________\n" +
    "Message scanned and verified for clarity.";

  return t + footer;
}

/* ===== SAFE SEND ===== */
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

  if (!gmail || !apppass || !to || !subject || !message)
    return res.json({ success: false, msg: "Missing Fields ❌", count: 0 });

  if (!stats[gmail]) stats[gmail] = { count: 0 };
  if (stats[gmail].count >= HOURLY_LIMIT)
    return res.json({ success: false, msg: "Hourly limit reached ❌", count: stats[gmail].count });

  const recipients = to.split(/,|\r?\n/).map(r => r.trim()).filter(Boolean);
  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (recipients.length > remaining)
    return res.json({ success: false, msg: "Limit full ❌", count: stats[gmail].count });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmail, pass: apppass }
  });

  try { await transporter.verify(); }
  catch {
    return res.json({ success: false, msg: "Wrong App Password ❌", count: stats[gmail].count });
  }

  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject(subject),
    text: safeBody(message),
    replyTo: gmail
  }));

  const sent = await sendSafely(transporter, mails);
  stats[gmail].count += sent;
  return res.json({ success: true, sent, count: stats[gmail].count });
});

app.listen(3000, () => console.log("✅ Safe Mail Server running on port 3000"));

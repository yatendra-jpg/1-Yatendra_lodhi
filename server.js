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

/* ================= HELPERS ================= */

/* Normalize subject to avoid spammy patterns (NO keyword removal) */
function normalizeSubject(subject) {
  return subject
    .replace(/\s{2,}/g, " ")
    .replace(/([!?])\1{1,}/g, "$1")
    .trim();
}

/* Normalize body: keep keywords but place them in natural context */
function normalizeBody(text) {
  let t = text
    .replace(/\r\n/g, "\n")
    .replace(/\s{3,}/g, "\n\n")
    .trim();

  // Soft context framing (does NOT remove words)
  // This reduces keyword-only lines which can look spammy
  const soften = [
    { k: /\breport\b/gi, r: "the attached report details" },
    { k: /\bproposal\b/gi, r: "the following proposal outlines" },
    { k: /\bprice list\b/gi, r: "the current price list includes" },
    { k: /\bquote\b/gi, r: "a quote has been prepared for" },
    { k: /\bscreenshot\b/gi, r: "a reference screenshot shows" },
    { k: /\berror\b/gi, r: "an error message indicates" },
    { k: /\brank\b/gi, r: "the current rank reflects" },
    { k: /\bfirst page\b/gi, r: "visibility on the first page suggests" }
  ];

  soften.forEach(({ k, r }) => {
    // Replace ONLY if the keyword is used as a standalone/heading-like token
    // Keep normal sentences untouched
    t = t.replace(new RegExp(`(^|\\n)\\s*${k.source.replace(/\\b/g,"")}\\s*(?=\\n|$)`, "gi"), `$1${r}`);
  });

  return t;
}

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
    return res.json({ success: false, msg: "Missing Fields ❌", count: 0 });
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

  /* NORMALIZE CONTENT (KEYWORDS KEPT, CONTEXT ADDED) */
  const safeSubject = normalizeSubject(subject);
  const safeBody = normalizeBody(message);

  /* FINAL TEXT WITH SAFE FOOTER */
  const finalText =
    safeBody +
    "\n\nScanned & Secured — www.avast.com";

  /* SMTP TRANSPORT */
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmail, pass: apppass }
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

  /* MAIL OBJECTS (CLEAN HEADERS, TEXT ONLY) */
  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject: safeSubject,
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

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
const PARALLEL = 3;      // SAME SPEED
const DELAY_MS = 120;   // SAME SPEED

let stats = {};
setInterval(() => { stats = {}; }, 60 * 60 * 1000);

/* ===== SUBJECT: HUMAN & NEUTRAL ===== */
function safeSubject(s) {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/([!?])\1+/g, "$1")
    .replace(/^[A-Z\s]+$/, t => t.toLowerCase())
    .replace(/\b(free|urgent|act now|guarantee|winner|limited)\b/gi, "")
    .trim();
}

/* ===== BODY: AUTO-ROTATE SAFE VARIATIONS ===== */
const VARIATIONS = [
  {
    error: "an error noticed during a brief review",
    glitch: "a small glitch observed during normal use",
    screenshot: "a screenshot prepared to clarify the details",
    rank: "current ranking visibility based on recent checks",
    report: "the report details are shared below for context",
    "price list": "the pricing details are included below for reference",
    google: "how it appears in Google results",
    site: "the site in its current setup",
    website: "the website in its present configuration",
    showing: "how it is currently showing in common views"
  },
  {
    error: "a minor issue identified during a quick check",
    glitch: "a brief inconsistency noticed during regular browsing",
    screenshot: "a short capture included to explain the point",
    rank: "recent visibility based on standard checks",
    report: "a short report is outlined below for clarity",
    "price list": "pricing information is noted below for reference",
    google: "its appearance within Google listings",
    site: "the site as configured at the moment",
    website: "the website in its current form",
    showing: "how it appears in typical views"
  },
  {
    error: "an item flagged during routine review",
    glitch: "a small variation noticed during use",
    screenshot: "a visual reference prepared for explanation",
    rank: "visibility indications from recent checks",
    report: "context from the report is shared below",
    "price list": "reference pricing details are mentioned below",
    google: "visibility within Google results",
    site: "the site in its present setup",
    website: "the website configuration at present",
    showing: "how it is presented in standard views"
  }
];

function safeBody(text) {
  let t = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Pick a random SAFE variation (ethical rotation)
  const v = VARIATIONS[Math.floor(Math.random() * VARIATIONS.length)];

  Object.entries(v).forEach(([word, sentence]) => {
    const re = new RegExp(`(^|\\n)\\s*${word}\\s*(?=\\n|$)`, "gi");
    t = t.replace(re, `$1${sentence}`);
  });

  // FINAL FOOTER (EXACT AS REQUESTED)
  const footer =
    "\n\nVerified for clarity secured\n" +
    "_____________________________";

  return t + footer;
}

/* ===== SAFE SEND (RATE CONTROLLED) ===== */
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

  if (!gmail || !apppass || !to || !subject || !message) {
    return res.json({ success: false, msg: "Missing Fields ❌", count: 0 });
  }

  if (!stats[gmail]) stats[gmail] = { count: 0 };
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({ success: false, msg: "Hourly limit reached ❌", count: stats[gmail].count });
  }

  const recipients = to.split(/,|\r?\n/).map(r => r.trim()).filter(Boolean);
  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (recipients.length > remaining) {
    return res.json({ success: false, msg: "Limit full ❌", count: stats[gmail].count });
  }

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

app.listen(3000, () => console.log("✅ AUTO-ROTATE SAFE Mail Server running on port 3000"));

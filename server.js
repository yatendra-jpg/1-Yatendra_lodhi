import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

/* BASIC SETUP */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* SIMPLE SESSION CONTROL (single active login) */
let activeSessionId = null;

/* ROUTES */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* LOGIN API */
app.post("/login", (req, res) => {
  const { id, pass } = req.body;

  if (id === "lodhi.onrender.com$$" && pass === "lodhi.onrender.com$$") {
    const sessionId = uuidv4();
    activeSessionId = sessionId; // old sessions auto-invalid
    return res.json({ success: true, sessionId });
  }
  return res.json({ success: false });
});

/* CONFIG */
const HOURLY_LIMIT = 28;
const PARALLEL = 4;        // safe fast (no pooling)
const stats = {};          // gmail → { count, start }

/* RESET AFTER 1 HOUR */
function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

/* SAFE PARALLEL SENDER (NO POOLING) */
async function sendParallel(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i += PARALLEL) {
    const batch = mails.slice(i, i + PARALLEL);

    const results = await Promise.allSettled(
      batch.map(m => transporter.sendMail(m))
    );

    results.forEach(r => {
      if (r.status === "fulfilled") sent++;
    });

    // soft delay → spam reduction
    await new Promise(r => setTimeout(r, 600));
  }

  return sent;
}

/* SEND API */
app.post("/send", async (req, res) => {
  const {
    sessionId,
    senderName,
    gmail,
    apppass,
    to,
    subject,
    message
  } = req.body;

  /* SESSION CHECK */
  if (sessionId !== activeSessionId) {
    return res.json({ success: false, msg: "Logged out" });
  }

  resetIfNeeded(gmail);

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
  if (recipients.length > remaining) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  const finalText =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.bitdefender.com - www.avast.com";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmail, pass: apppass }
  });

  /* VERIFY PASSWORD ONLY ONCE */
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
    subject,
    text: finalText
  }));

  const sentCount = await sendParallel(transporter, mails);
  stats[gmail].count += sentCount;

  return res.json({
    success: true,
    sent: sentCount,
    count: stats[gmail].count
  });
});

/* START */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Mail Server running on port", PORT);
});

import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ================= CONFIG ================= */
const HOURLY_LIMIT = 28;
const PARALLEL = 3; // spam-safe
const stats = {};   // gmail -> { count, start }

/* ================= HELPERS ================= */
function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

    // 🔑 micro delay (spam control)
    await sleep(150 + Math.random() * 100);
  }
  return sent;
}

/* ================= SEND API ================= */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  resetIfNeeded(gmail);

  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (recipients.length > remaining) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

  /* ✉️ Final message (plain text only) */
  const finalText =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.bitdefender.com - www.avast.com";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmail, pass: apppass }
  });

  // 🔐 password check ONLY here
  try {
    await transporter.verify();
  } catch {
    return res.json({ success: false, msg: "Wrong App Password ❌", count: stats[gmail].count });
  }

  const mails = recipients.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject,
    text: finalText
  }));

  const sentCount = await sendSafely(transporter, mails);
  stats[gmail].count += sentCount;

  res.json({
    success: true,
    sent: sentCount,
    count: stats[gmail].count
  });
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Mail Server running on", PORT);
});

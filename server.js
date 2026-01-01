import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ================= CONFIG ================= */
const LOGIN_ID = "lodhi.onrender.com$$";
const HOURLY_LIMIT = 28;
const PARALLEL = 5;

/* ================= STATE ================= */
const stats = {};          // gmail -> { count, start }
let activeSession = null;  // single active login
let sendingLock = false;   // 🔒 prevents logout during sending

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

async function sendParallel(transporter, mails) {
  let sent = 0;

  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(
      chunk.map(m => transporter.sendMail(m))
    );
    results.forEach(r => r.status === "fulfilled" && sent++);
  }
  return sent;
}

/* ================= AUTH ================= */
app.post("/login", (req, res) => {
  const { id, pass } = req.body;

  if (id !== LOGIN_ID || pass !== LOGIN_ID) {
    return res.status(401).json({ ok: false });
  }

  const token = crypto.randomUUID();
  activeSession = token;

  res.json({ ok: true, token });
});

app.post("/check-session", (req, res) => {
  const { token } = req.body;

  if (sendingLock) {
    // ❗ do NOT logout while sending
    return res.json({ valid: true });
  }

  res.json({ valid: token === activeSession });
});

app.post("/logout", (req, res) => {
  if (sendingLock) {
    return res.json({ ok: false });
  }
  activeSession = null;
  res.json({ ok: true });
});

/* ================= SEND MAIL ================= */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  sendingLock = true; // 🔒 prevent auto-logout
  resetIfNeeded(gmail);

  try {
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

    // verify password ONCE
    await transporter.verify();

    const mails = recipients.map(r => ({
      from: `"${senderName}" <${gmail}>`,
      to: r,
      subject,
      text: finalText
    }));

    const sent = await sendParallel(transporter, mails);
    stats[gmail].count += sent;

    res.json({
      success: true,
      sent,
      count: stats[gmail].count
    });

  } catch (e) {
    res.json({
      success: false,
      msg: "Mail Failed ❌",
      count: stats[gmail]?.count || 0
    });
  } finally {
    sendingLock = false; // 🔓 unlock after send
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Secure Mail Server running on", PORT);
});

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

/* -------- SINGLE SESSION -------- */
let activeSessionToken = null;

/* -------- ROUTES -------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* login → issue new token, invalidate old */
app.post("/login", (req, res) => {
  const { uid, upass } = req.body;
  if (uid === "@#vashashekhpurgarhwa" && upass === "@#vashashekhpurgarhwa") {
    activeSessionToken = crypto.randomBytes(16).toString("hex");
    return res.json({ success: true, token: activeSessionToken });
  }
  res.json({ success: false });
});

/* session check */
app.post("/check-session", (req, res) => {
  const { token } = req.body;
  res.json({ valid: token === activeSessionToken });
});

/* -------- MAIL CONFIG -------- */
const HOURLY_LIMIT = 28;
const PARALLEL = 6;          // थोड़ा fast, still safe
const stats = {};            // gmail -> { count, start }

function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

async function sendBulk(transporter, mails) {
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

/* -------- SEND API -------- */
app.post("/send", async (req, res) => {
  const { token, senderName, gmail, apppass, to, subject, message } = req.body;

  if (token !== activeSessionToken) {
    return res.json({ success: false, msg: "SESSION_EXPIRED" });
  }

  resetIfNeeded(gmail);
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

  const recipients = to.split(/,|\r?\n/).map(r => r.trim()).filter(Boolean);
  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (recipients.length > remaining) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

  const finalText =
    message.trim() + "\n\n📩 Scanned & Secured — www.avast.com";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    auth: { user: gmail, pass: apppass }
  });

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

  const sent = await sendBulk(transporter, mails);
  stats[gmail].count += sent;

  res.json({ success: true, sent, count: stats[gmail].count });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Secure Mail Console running")
);

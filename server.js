import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ---------- CONFIG ---------- */
const HOURLY_LIMIT = 28;
const MAX_PARALLEL = 5; // 🔐 anti-spam safe
const stats = {}; // gmail -> { count, start }

/* ---------- HELPERS ---------- */
function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

async function sendBatch(transporter, mails) {
  const chunks = [];
  for (let i = 0; i < mails.length; i += MAX_PARALLEL) {
    chunks.push(mails.slice(i, i + MAX_PARALLEL));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(m => transporter.sendMail(m))
    );
  }
}

/* ---------- ROUTES ---------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/send", async (req, res) => {
  const { senders, to, subject, message } = req.body;

  const recipients = to
    .split(/\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  const mailText = message + "\n\n📩 Secure — www.avast.com";

  let totalSent = 0;
  let failed = [];

  for (const s of senders) {
    const { name, gmail, apppass } = s;
    resetIfNeeded(gmail);

    const available = HOURLY_LIMIT - stats[gmail].count;
    if (available <= 0) continue;

    const batchRecipients = recipients.splice(0, available);
    if (batchRecipients.length === 0) break;

    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmail, pass: apppass }
      });

      await transporter.verify(); // 🔐 password check

      const mails = batchRecipients.map(r => ({
        from: `"${name}" <${gmail}>`,
        to: r,
        subject,
        text: mailText
      }));

      await sendBatch(transporter, mails);

      stats[gmail].count += mails.length;
      totalSent += mails.length;

    } catch (err) {
      failed.push(gmail);
    }
  }

  res.json({
    success: true,
    sent: totalSent,
    failed
  });
});

/* ---------- START ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Fast Mail Server Running");
});

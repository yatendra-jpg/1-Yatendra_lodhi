import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ===== CONFIG ===== */
const HOURLY_LIMIT = 28;
const PARALLEL = 5; // safe fast (NOT burst)
const stats = {};  // gmail -> {count, start}

/* ===== HELPERS ===== */
function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

async function sendInChunks(transporter, mails) {
  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);
    await Promise.all(chunk.map(m => transporter.sendMail(m)));
  }
}

/* ===== SEND ===== */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  resetIfNeeded(gmail);

  const remaining = HOURLY_LIMIT - stats[gmail].count;
  if (remaining <= 0) {
    return res.json({ success: false, msg: "Mail Limit Full ❌" });
  }

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean)
    .slice(0, remaining);

  const text =
    message.trim() + "\n\n📩 Secure — www.avast.com";

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmail, pass: apppass }
    });

    await transporter.verify();

    const mails = recipients.map(r => ({
      from: `"${senderName}" <${gmail}>`,
      to: r,
      subject,
      text
    }));

    await sendInChunks(transporter, mails);

    stats[gmail].count += mails.length;

    res.json({
      success: true,
      sent: mails.length
    });

  } catch {
    res.json({ success: false, msg: "Wrong App Password ❌" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Safe Fast Mail Sender Running");
});

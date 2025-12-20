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
const PARALLEL = 5;
const stats = {}; // gmail -> { count, start }

function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

async function sendChunks(transporter, mails) {
  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);
    await Promise.all(chunk.map(m => transporter.sendMail(m)));
  }
}

app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  resetIfNeeded(gmail);

  // 🔒 HARD BLOCK
  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  const remaining = HOURLY_LIMIT - stats[gmail].count;

  const recipients = to
    .split(/,|\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);

  // अगर remaining से ज़्यादा mail हैं → block
  if (recipients.length > remaining) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌",
      count: stats[gmail].count
    });
  }

  const finalText =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.avast.com";

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
      text: finalText
    }));

    await sendChunks(transporter, mails);

    stats[gmail].count += mails.length;

    res.json({
      success: true,
      sent: mails.length,
      count: stats[gmail].count
    });

  } catch {
    res.json({
      success: false,
      msg: "Wrong App Password ❌",
      count: stats[gmail].count
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server Running");
});

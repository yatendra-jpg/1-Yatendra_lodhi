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

/* 🔒 PER EMAIL LIMIT */
const LIMIT = 28;
const stats = {}; 
// stats[gmail] = { count, start }

function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
  if (Date.now() - stats[gmail].start >= 60 * 60 * 1000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

app.post("/send", async (req, res) => {
  const { senders, to, subject, message } = req.body;

  const recipients = to
    .split(/\r?\n/)
    .map(e => e.trim())
    .filter(Boolean);

  const finalText = message + "\n\n📩 Secure — www.avast.com";

  let sent = 0;
  let failedSenders = [];

  for (const sender of senders) {
    const { gmail, apppass, name } = sender;
    resetIfNeeded(gmail);

    let available = LIMIT - stats[gmail].count;
    if (available <= 0) continue;

    const batch = recipients.splice(0, available);
    if (batch.length === 0) break;

    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmail, pass: apppass }
      });

      await transporter.verify();

      for (const r of batch) {
        await transporter.sendMail({
          from: `"${name}" <${gmail}>`,
          to: r,
          subject,
          text: finalText
        });
        stats[gmail].count++;
        sent++;
      }

    } catch {
      failedSenders.push(gmail);
    }
  }

  res.json({
    success: true,
    sent,
    failedSenders
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Bulk Mail Server Running");
});

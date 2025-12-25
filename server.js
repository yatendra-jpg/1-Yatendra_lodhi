import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* 🔹 FIXED ROUTES */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html"))
);

app.get("/login.html", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "login.html"))
);

app.get("/launcher.html", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "launcher.html"))
);

/* CONFIG */
const HOURLY_LIMIT = 28;
const PARALLEL = 5;
const stats = {};

/* RESET */
function resetIfNeeded(gmail) {
  if (!stats[gmail] || Date.now() - stats[gmail].start > 3600000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

/* SEND SAFE */
async function sendBulk(transporter, mails) {
  let sent = 0;
  for (let i = 0; i < mails.length; i += PARALLEL) {
    const chunk = mails.slice(i, i + PARALLEL);
    const res = await Promise.allSettled(
      chunk.map(m => transporter.sendMail(m))
    );
    res.forEach(r => r.status === "fulfilled" && sent++);
  }
  return sent;
}

/* SEND API */
app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  resetIfNeeded(gmail);

  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

  const recipients = to.split(/,|\n/).map(e => e.trim()).filter(Boolean);
  if (recipients.length + stats[gmail].count > HOURLY_LIMIT) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

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

  const finalText =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.avast.com";

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

app.listen(3000, () => console.log("✅ Server running"));

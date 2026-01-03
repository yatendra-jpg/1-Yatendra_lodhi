import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ✅ ROOT FIX */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* CONFIG */
const HOURLY_LIMIT = 28;
const PARALLEL = 5;
const stats = {};

function resetIfNeeded(gmail) {
  if (!stats[gmail]) {
    stats[gmail] = { count: 0, start: Date.now() };
    return;
  }
  if (Date.now() - stats[gmail].start > 3600000) {
    stats[gmail] = { count: 0, start: Date.now() };
  }
}

async function sendParallel(transporter, mails) {
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

app.post("/send", async (req, res) => {
  const { senderName, gmail, apppass, to, subject, message } = req.body;

  resetIfNeeded(gmail);

  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

  const list = to.split(/,|\n/).map(x => x.trim()).filter(Boolean);
  if (list.length + stats[gmail].count > HOURLY_LIMIT) {
    return res.json({ success: false, msg: "Mail Limit Full ❌", count: stats[gmail].count });
  }

  const text =
    message.trim() +
    "\n\n📩 Scanned & Secured — www.bitdefender.com - www.avast.com";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmail, pass: apppass }
  });

  try {
    await transporter.verify();
  } catch {
    return res.json({ success: false, msg: "Wrong App Password ❌", count: stats[gmail].count });
  }

  const mails = list.map(r => ({
    from: `"${senderName}" <${gmail}>`,
    to: r,
    subject,
    text
  }));

  const sent = await sendParallel(transporter, mails);
  stats[gmail].count += sent;

  res.json({ success: true, sent, count: stats[gmail].count });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Server running")
);

import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

const HOURLY_LIMIT = 28;
const PARALLEL = 3;   // slower but safer
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

app.post("/send", async (req, res) => {
  const { gmail, apppass, to, subject, message } = req.body;
  resetIfNeeded(gmail);

  if (stats[gmail].count >= HOURLY_LIMIT) {
    return res.json({ success:false, msg:"Mail Limit Full ❌" });
  }

  const recipients = to.split(/,|\n/).filter(Boolean);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 1,
    auth: { user: gmail, pass: apppass }
  });

  try {
    await transporter.verify();
  } catch {
    return res.json({ success:false, msg:"Wrong App Password ❌" });
  }

  let sent = 0;
  for (const r of recipients) {
    try {
      await transporter.sendMail({
        from: gmail,
        to: r,
        subject,
        text: message + "\n\n📩 Scanned & Secured — www.avast.com"
      });
      sent++;
      stats[gmail].count++;
    } catch {}
  }

  res.json({ success:true, sent, count: stats[gmail].count });
});

app.listen(3000, () => console.log("Server running"));

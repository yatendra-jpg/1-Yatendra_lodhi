import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* 🔒 HARD LIMIT SETTINGS */
const HOURLY_LIMIT = 28;
const DELAY_MS = 4200; // ~4–5 sec
let sentCount = 0;
let lastSent = 0;
let hourStart = Date.now();

function resetHour() {
  if (Date.now() - hourStart >= 60 * 60 * 1000) {
    sentCount = 0;
    hourStart = Date.now();
  }
}

app.post("/send", async (req, res) => {
  resetHour();

  if (sentCount >= HOURLY_LIMIT) {
    return res.status(429).json({
      success: false,
      msg: "Mail Limit Full ❌ (28/hour)"
    });
  }

  const { gmail, apppass, to, subject, message, sender } = req.body;

  if (!gmail || !apppass) {
    return res.json({ success: false, msg: "Invalid Credentials ❌" });
  }

  const now = Date.now();
  if (now - lastSent < DELAY_MS) {
    return res.json({ success: false, msg: "Please wait ⏳" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmail,
        pass: apppass
      }
    });

    await transporter.verify(); // ❌ wrong app password stops here

    await transporter.sendMail({
      from: `"${sender}" <${gmail}>`,
      to,
      subject,
      text: message // 📄 PLAIN TEXT ONLY
    });

    sentCount++;
    lastSent = Date.now();

    res.json({
      success: true,
      count: sentCount
    });

  } catch (err) {
    res.json({
      success: false,
      msg: "Wrong App Password ❌"
    });
  }
});

app.listen(3000, () => {
  console.log("✅ Secure Mail Server Running");
});

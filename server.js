import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* 🔑 ROOT FIX */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

/* 🔒 HARD LIMIT CONFIG */
const HOURLY_LIMIT = 28;
const DELAY_MS = 4200;

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

  const now = Date.now();
  if (now - lastSent < DELAY_MS) {
    return res.json({ success: false, msg: "Please wait ⏳" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmail, pass: apppass }
    });

    await transporter.verify(); // ❌ wrong app password stops here

    await transporter.sendMail({
      from: `"${sender}" <${gmail}>`,
      to,
      subject,
      text: message // 📄 plain text only
    });

    sentCount++;
    lastSent = Date.now();

    res.json({ success: true, count: sentCount });

  } catch {
    res.json({ success: false, msg: "Wrong App Password ❌" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});

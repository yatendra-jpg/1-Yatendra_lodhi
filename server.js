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

/* 📊 PER EMAIL TRACKING */
const LIMIT = 28;
const emailStats = {};

function resetIfNeeded(email) {
  if (!emailStats[email]) {
    emailStats[email] = { count: 0, start: Date.now() };
  }
  if (Date.now() - emailStats[email].start >= 60 * 60 * 1000) {
    emailStats[email] = { count: 0, start: Date.now() };
  }
}

app.post("/send", async (req, res) => {
  const { gmail, apppass, to, subject, message, sender } = req.body;

  resetIfNeeded(gmail);

  if (emailStats[gmail].count >= LIMIT) {
    return res.json({
      success: false,
      msg: "Mail Limit Full ❌"
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmail, pass: apppass }
    });

    await transporter.verify();

    const finalText =
      message + "\n\n📩 Secure — www.avast.com";

    await transporter.sendMail({
      from: `"${sender}" <${gmail}>`,
      to,
      subject,
      text: finalText
    });

    emailStats[gmail].count++;

    res.json({ success: true });

  } catch {
    res.json({
      success: false,
      msg: "Wrong Password ❌"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Secure Mail Server Running");
});

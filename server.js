const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const VALID_USER = "secure-user@#882";
const VALID_PASS = "secure-user@#882";

// LOGIN API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username === VALID_USER && password === VALID_PASS) {
    return res.json({ success: true });
  }

  return res.json({ success: false });
});

// SEND MAIL API
app.post("/api/send", async (req, res) => {
  const { senderName, gmail, appPass, subject, message, recipients } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmail, pass: appPass },
    });

    let emails = recipients.split(/\r?\n|,/).map((e) => e.trim()).filter(Boolean);

    for (let email of emails) {
      await transporter.sendMail({
        from: `${senderName} <${gmail}>`,
        to: email,
        subject,
        text: message + "\n\n\n📩 www.mail-verification-secure.com"
      });
    }

    return res.json({ success: true, count: emails.length });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

// ROUTES FIXED (Render Compatible)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/launcher", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server Running on PORT", PORT));

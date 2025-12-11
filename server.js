const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// public folder access
app.use(express.static(path.join(__dirname, "public")));

// LOGIN ID & PASSWORD
const LOGIN_ID = "yatendra882@#";
const LOGIN_PASS = "yatendra882@#";

// -------------------------------------------
// ✅ FIX 1: Root route must load login.html
// -------------------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// -------------------------------------------
// ✅ FIX 2: Launcher route must load launcher.html
// -------------------------------------------
app.get("/launcher", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

// -------------------------------------------
// LOGIN API
// -------------------------------------------
app.post("/api/login", (req, res) => {
  const { id, password } = req.body;

  if (id === LOGIN_ID && password === LOGIN_PASS) {
    return res.json({ success: true });
  }
  res.json({ success: false });
});

// -------------------------------------------
// SEND EMAILS API (Super Fast + Safe)
// -------------------------------------------
app.post("/api/send", async (req, res) => {
  const { senderName, gmail, appPassword, subject, message, recipients } = req.body;

  try {
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmail,
        pass: appPassword,
      },
    });

    let sentCount = 0;

    for (let email of recipients) {
      await transporter.sendMail({
        from: `${senderName} <${gmail}>`,
        to: email,
        subject,
        text: message,
      });

      sentCount++;

      // 🟦 Ultra Fast Safe Delay (20ms)
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    return res.json({ success: true, sent: sentCount });

  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

// -------------------------------------------
// START SERVER
// -------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});

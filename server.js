const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const LOGIN_ID = "yatendra882@#";
const LOGIN_PASS = "yatendra882@#";

// ✅ FIX: Root route must serve login.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// POST login
app.post("/api/login", (req, res) => {
  const { id, password } = req.body;

  if (id === LOGIN_ID && password === LOGIN_PASS) {
    return res.json({ success: true });
  }
  res.json({ success: false });
});

// Send emails
app.post("/api/send", async (req, res) => {
  const { senderName, gmail, appPassword, subject, message, recipients } = req.body;

  console.log("Incoming request:", req.body);

  // SAFETY VALIDATION
  if (!gmail || !appPassword) {
    return res.json({ success: false, error: "Invalid Credentials" });
  }

  try {
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmail,
        pass: appPassword,
      },
    });

    let successCount = 0;

    for (let email of recipients) {
      await transporter.sendMail({
        from: `${senderName} <${gmail}>`,
        to: email,
        subject,
        text: message,
      });

      successCount++;

      await new Promise(resolve => setTimeout(resolve, 20)); // SUPER FAST SAFE DELAY
    }

    return res.json({ success: true, sent: successCount });

  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));

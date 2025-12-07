const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const USERNAME = "admin";
const PASSWORD = "admin"; // same id + password

// Fix GET /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === USERNAME && password === PASSWORD) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.get("/launcher", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

// FAST EMAIL SENDER
app.post("/send", async (req, res) => {
  const { gmail, appPassword, subject, message, recipients } = req.body;

  const emails = recipients
    .split(/[\n,]+/)
    .map(e => e.trim())
    .filter(e => e);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmail,
      pass: appPassword
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 1000
  });

  let success = 0;
  let failed = 0;

  for (let email of emails) {
    try {
      await transporter.sendMail({
        from: gmail,
        to: email,
        subject: subject,
        text: message
      });
      success++;
    } catch (err) {
      failed++;
    }
  }

  res.json({
    sent: success,
    failed: failed,
    total: emails.length
  });
});

app.listen(PORT, () => console.log("Server running on port " + PORT));

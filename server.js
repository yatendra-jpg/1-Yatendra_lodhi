const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const VALID_USER = "secure-user@#882";
const VALID_PASS = "secure-user@#882";

// LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username === VALID_USER && password === VALID_PASS) {
    return res.json({ success: true });
  }

  return res.json({ success: false });
});

// SAFE GMAIL SENDING ENGINE
app.post("/api/send", async (req, res) => {
  const { senderName, gmail, appPass, subject, message, recipients } = req.body;

  // processing list
  let list = recipients
    .split(/[\n,]+/)
    .map((e) => e.trim())
    .filter(Boolean);

  // Gmail transporter (SAFE MODE)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmail, pass: appPass },
  });

  const footer = "\n\n\n📩  www.mail-verification-secure.com";

  let sent = 0;

  try {
    for (let email of list) {
      await transporter.sendMail({
        from: `${senderName} <${gmail}>`,
        to: email,
        subject,
        text: message + footer,
      });

      sent++;

      // Gmail safe throttle (prevents block)
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    return res.json({ success: true, count: sent });
  } catch (err) {
    return res.json({ success: false, error: "PASSWORD_WRONG" });
  }
});

// ROUTES
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/launcher", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

app.listen(5000, () => console.log("SAFE SERVER RUNNING"));

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, "public");

/* FIXED LOGIN */
const HARD_USER = "secure-user@#882";
const HARD_PASS = "secure-user@#882";

/* SAFE SPEED */
const MIN_DELAY = 150;
const MAX_DELAY = 250;

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.use(express.static(PUBLIC_DIR));
app.use(bodyParser.json());

app.use(
  session({
    secret: "mail-secure-key",
    resave: false,
    saveUninitialized: true
  })
);

/* LOGIN HANDLER */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USER && password === HARD_PASS) {
    req.session.user = username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "Invalid Credentials ❌" });
});

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* PAGES */
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/launcher", requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, "launcher.html")));

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

/* SEND EMAIL */
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, subject, message, recipients } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));

    if (!list.length) return res.json({ success: false, message: "No valid email list found ❌" });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password }
    });

    await transporter.verify().catch(() => {
      return res.json({ success: false, message: "Wrong App Password ❌" });
    });

    let sent = 0;
    let failed = 0;

    for (let r of list) {
      try {
        await transporter.sendMail({
          from: `"${senderName || "Secure Sender"}" <${email}>`,
          to: r,
          subject,
          html: `
            <div style="font-size:15px;line-height:1.5;">${message.replace(/\n/g, "<br>")}</div>
            <br><br>
            <small style="color:#888;font-size:11px;">This email is scanned — www.avast.com 🔐</small>
          `
        });
        sent++;
      } catch {
        failed++;
      }

      await delay(rand(MIN_DELAY, MAX_DELAY)); // SAFE SPEED
    }

    return res.json({
      success: true,
      message: `Mail Sent Successfully ✔ [${sent}]`
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log("Server running 🔐"));

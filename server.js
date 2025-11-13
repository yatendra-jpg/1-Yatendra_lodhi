require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// === LOGIN ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// === LIMIT SYSTEM ===
const ONE_HOUR = 60 * 60 * 1000;
const MAX_PER_HOUR = 31;

// email => { count, reset }
let LIMIT = {};

function checkLimit(email, amount) {
  if (!LIMIT[email]) {
    LIMIT[email] = {
      count: 0,
      reset: Date.now() + ONE_HOUR
    };
  }

  // reset if expired
  if (Date.now() > LIMIT[email].reset) {
    LIMIT[email].count = 0;
    LIMIT[email].reset = Date.now() + ONE_HOUR;
  }

  // if limit reached
  if (LIMIT[email].count + amount > MAX_PER_HOUR) {
    return {
      allowed: false,
      used: LIMIT[email].count,
      left: MAX_PER_HOUR - LIMIT[email].count,
      resetIn: Math.floor((LIMIT[email].reset - Date.now()) / 1000)
    };
  }

  return { allowed: true };
}

const delay = ms => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Middleware
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
  secret: "bulk-mailer-secret",
  resave: false,
  saveUninitialized: true
}));

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/');
}

// LOGIN
app.post('/login', (req, res) => {
  if (req.body.username === HARD_USERNAME && req.body.password === HARD_PASSWORD) {
    req.session.user = HARD_USERNAME;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'launcher.html'))
);

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// SEND MAIL
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing Fields" });

    const list = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(Boolean);

    // === LIMIT CHECK ===
    const limitCheck = checkLimit(email, list.length);
    if (!limitCheck.allowed)
      return res.json({
        success: false,
        message: `❌ Hourly limit exceeded`,
        used: limitCheck.used,
        left: limitCheck.left,
        resetIn: limitCheck.resetIn
      });

    // transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong App Password" });
    }

    let sent = 0;
    let fail = 0;

    for (let to of list) {
      try {
        await transporter.sendMail({
          from: `"${senderName || "Sender"}" <${email}>`,
          to,
          subject: subject || "",
          text: message || ""
        });

        sent++;
        LIMIT[email].count++;

      } catch (err) {
        fail++;
      }

      await delay(randomDelay(250, 600));
    }

    return res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: MAX_PER_HOUR - LIMIT[email].count
    });

  } catch (e) {
    return res.json({ success: false, message: e.message });
  }
});

// fallback
app.use((req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'))
);

app.listen(PORT, () =>
  console.log("🚀 Bulk Mailer Running on PORT: " + PORT)
);

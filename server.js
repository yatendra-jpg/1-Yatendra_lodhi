require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Login details
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Email Limit System
let EMAIL_LIMIT = {};  
// Structure:
// EMAIL_LIMIT[email] = { count: 0, resetTime: Date.now() + 1 hour }

// LIMIT PER HOUR
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

// UTIL
const delay = ms => new Promise(r => setTimeout(r, ms));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "bulk-mailer-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/');
}

// Routes
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));

app.post('/login', (req, res) => {
  if (req.body.username === HARD_USERNAME && req.body.password === HARD_PASSWORD) {
    req.session.user = req.body.username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid login" });
});

app.get('/launcher', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"));
});

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

    // Validate
    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing required fields" });

    // Initialize limit if first time
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = {
        count: 0,
        resetTime: Date.now() + ONE_HOUR
      };
    }

    // Reset counter after 1 hour
    if (Date.now() > EMAIL_LIMIT[email].resetTime) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].resetTime = Date.now() + ONE_HOUR;
    }

    // Prepare recipient list
    const list = recipients.split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);

    // Check Limit
    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR) {
      return res.json({
        success: false,
        message: `❌ Hourly limit reached: Only ${MAX_MAILS_PER_HOUR} mails allowed per hour`
      });
    }

    // Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch (e) {
      return res.json({ success: false, message: "❌ Incorrect App Password" });
    }

    let successCount = 0;
    let failCount = 0;

    // Safe sending (3 at a time + random delay)
    for (let to of list) {
      try {
        await transporter.sendMail({
          from: `"${senderName || "Sender"}" <${email}>`,
          to,
          subject: subject || "No Subject",
          text: message || ""
        });

        successCount++;
        EMAIL_LIMIT[email].count++;

      } catch (err) {
        failCount++;
      }

      // random safe delay
      await delay(Math.floor(Math.random() * 400) + 300);
    }

    res.json({
      success: true,
      message: `✅ Sent: ${successCount} | ❌ Failed: ${failCount}`,
      left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// fallback
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const { parse } = require('tldts');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Login details
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Hourly Limit System per Gmail ID
let EMAIL_LIMIT = {};  
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

// Smart adaptive sending settings
const BASE_BATCH_SIZE = 5;
const BASE_BATCH_DELAY = 200;
const JITTER_MS = 150;
const FAILURE_THRESHOLD = 0.20;
const BACKOFF_MULTIPLIER = 2.5;
const COOLDOWN_WINDOW_MS = 5 * 60 * 1000;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "bulk-mailer-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: ONE_HOUR }
}));

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/');
}

// Helper functions
const delay = ms => new Promise(r => setTimeout(r, ms));
const randJitter = m => Math.floor((Math.random() * 2 - 1) * m);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Routes
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.post('/login', (req, res) => {
  if (req.body.username === HARD_USERNAME && req.body.password === HARD_PASSWORD) {
    req.session.user = req.body.username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid login" });
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
      return res.json({ success: false, message: "❌ Missing fields" });

    // Initialize limit for email if not exists
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = {
        count: 0,
        resetTime: Date.now() + ONE_HOUR
      };
    }

    // Reset hourly usage
    if (Date.now() > EMAIL_LIMIT[email].resetTime) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].resetTime = Date.now() + ONE_HOUR;
    }

    // Parse recipient list
    const list = recipients.split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);

    if (!list.length) return res.json({ success: false, message: "No recipients" });

    // Check limit BEFORE sending
    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR) {
      return res.json({
        success: false,
        message: `❌ Hourly limit reached. Allowed: ${MAX_MAILS_PER_HOUR} per hour`,
        used: EMAIL_LIMIT[email].count
      });
    }

    // Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try { await transporter.verify(); }
    catch { return res.json({ success: false, message: "❌ Wrong App Password" }); }

    let sentCount = 0, failCount = 0;

    // Smart sending
    for (const to of list) {
      try {
        await transporter.sendMail({
          from: `"${senderName || "Sender"}" <${email}>`,
          to,
          subject: subject || "No Subject",
          text: message || ""
        });
        sentCount++;
        EMAIL_LIMIT[email].count++;
      } catch {
        failCount++;
      }

      const d = BASE_BATCH_DELAY + randJitter(JITTER_MS);
      await delay(d);
    }

    res.json({
      success: true,
      message: `✅ Sent: ${sentCount} | ❌ Failed: ${failCount}`,
      used: EMAIL_LIMIT[email].count,
      left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Fallback
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, () => console.log("🚀 Server running at http://localhost:" + PORT));

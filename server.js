require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// === LOGIN CREDS ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// === SENDING SETTINGS (F3 with Warm-Up) ===
let sentCounter = 0; // resets on restart

const BASE_BATCH_SIZE = 5;        // fast
const SAFE_BATCH_SIZE = 3;        // safer
const BASE_DELAY = 200;           // ms
const SAFE_DELAY_MIN = 250;       // ms
const SAFE_DELAY_MAX = 600;       // ms

// Warm-Up: slower first 12 emails
function getWarmupSettings() {
  if (sentCounter < 5) return { size: 2, delay: 700 };
  if (sentCounter < 12) return { size: 3, delay: 500 };
  return null;
}

// Utils
const delay = ms => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
  secret: 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: 24*60*60*1000 }
}));

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  res.redirect('/');
}

// Routes
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'launcher.html'));
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// SEND MAIL
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "Email, password and recipients required" });

    const list = recipients.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
    if (!list.length) return res.json({ success: false, message: "No valid recipients" });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    // verify Gmail login first
    try { await transporter.verify(); }
    catch (e) { return res.json({ success: false, message: "❌ App Password Incorrect" }); }

    let successCount = 0, failCount = 0;

    for (let i = 0; i < list.length; ) {
      let batchSize = BASE_BATCH_SIZE;
      let batchDelay = BASE_DELAY;

      const warm = getWarmupSettings();
      if (warm) {
        batchSize = warm.size;
        batchDelay = warm.delay;
      } else {
        batchSize = SAFE_BATCH_SIZE;
        batchDelay = randomDelay(SAFE_DELAY_MIN, SAFE_DELAY_MAX);
      }

      const batch = list.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(to => transporter.sendMail({
          from: `"${senderName || 'Sender'}" <${email}>`,
          to,
          subject: subject || "No Subject",
          text: message || ""
        }))
      );

      results.forEach(r => r.status === "fulfilled" ? successCount++ : failCount++);
      sentCounter += batch.length;
      i += batch.length;

      await delay(batchDelay);
    }

    res.json({
      success: successCount > 0,
      message: `✅ Sent: ${successCount} | ❌ Failed: ${failCount}`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// fallback
app.use((req,res)=> res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, () => console.log(`✅ Bulk Mailer running at http://localhost:${PORT}`));

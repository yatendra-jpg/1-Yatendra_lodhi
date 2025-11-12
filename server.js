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

// === LIMITS ===
const MAX_PER_EMAIL = 26; // per sender account

// === SEND SETTINGS (Safe Fast) ===
const SAFE_BATCH_SIZE = 3;
const SAFE_DELAY_MIN = 250;
const SAFE_DELAY_MAX = 600;
const delay = ms => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
  secret: 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  res.redirect('/');
}

// Track email send count per account
const sendCounts = {}; // { email: count }

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

app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "Email, password and recipients required" });

    const list = recipients.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
    if (!list.length) return res.json({ success: false, message: "No valid recipients" });

    // limit check
    sendCounts[email] = sendCounts[email] || 0;
    if (sendCounts[email] >= MAX_PER_EMAIL)
      return res.json({ success: false, message: `❌ Limit reached (Max ${MAX_PER_EMAIL} mails per account)` });

    const remaining = MAX_PER_EMAIL - sendCounts[email];
    const limitedList = list.slice(0, remaining);

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try { await transporter.verify(); }
    catch (e) { return res.json({ success: false, message: "❌ App Password Incorrect" }); }

    let successCount = 0, failCount = 0;

    for (let i = 0; i < limitedList.length; i += SAFE_BATCH_SIZE) {
      const batch = limitedList.slice(i, i + SAFE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(to => transporter.sendMail({
          from: `"${senderName || 'Sender'}" <${email}>`,
          to,
          subject: subject || "No Subject",
          text: message || ""
        }))
      );

      results.forEach(r => r.status === "fulfilled" ? successCount++ : failCount++);
      sendCounts[email] += batch.length;
      await delay(randomDelay(SAFE_DELAY_MIN, SAFE_DELAY_MAX));
    }

    let msg = `✅ Sent: ${successCount} | ❌ Failed: ${failCount}`;
    if (sendCounts[email] >= MAX_PER_EMAIL) msg += ` | Limit reached (${MAX_PER_EMAIL})`;

    res.json({ success: successCount > 0, message: msg });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, () => console.log(`✅ Bulk Mailer running at http://localhost:${PORT}`));

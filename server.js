require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// === Credentials (case-sensitive) ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// FAST sending settings (original fast)
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/');
}

// Routes
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'launcher.html')));

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// helper
const delay = ms => new Promise(r => setTimeout(r, ms));

async function sendBatch(transporter, mails, batchSize = BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < mails.length; i += batchSize) {
    const batch = mails.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(m => transporter.sendMail(m)));
    results.push(...settled);
    await delay(BATCH_DELAY_MS);
  }
  return results;
}

// Send endpoint
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "Email, password and recipients required" });
    }

    const list = recipients.split(/[\n,]+/).map(r => r.trim()).filter(Boolean);
    if (!list.length) return res.json({ success: false, message: "No valid recipients" });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    // optional quick verify to show auth errors early
    try { await transporter.verify(); } catch (err) {
      return res.json({ success: false, message: `Authentication failed: ${err.message}` });
    }

    const mails = list.map(to => ({
      from: `"${senderName || 'Anonymous'}" <${email}>`,
      to,
      subject: subject || "No Subject",
      text: message || ""
    }));

    const results = await sendBatch(transporter, mails, BATCH_SIZE);

    let successCount = 0, failedCount = 0;
    results.forEach(r => { if (r.status === 'fulfilled') successCount++; else failedCount++; });

    return res.json({
      success: successCount > 0,
      message: `✅ Sent: ${successCount} | ❌ Failed: ${failedCount}`,
      details: results
    });

  } catch (err) {
    console.error('Send error:', err);
    return res.json({ success: false, message: err.message || String(err) });
  }
});

// Fallback
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

// Start
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

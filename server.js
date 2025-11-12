require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// === LOGIN CREDS (case-sensitive) ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

/**
 * Sending policy:
 * - No app-side per-account limit (UNLIMITED)
 * - Uses Warm-up + human-like delays to reduce block risk (not a guarantee)
 */

const BASE_BATCH_SIZE = 5;
const WARMUP_PHASES = [
  { sentUntil: 5, size: 2, delay: 700 },
  { sentUntil: 12, size: 3, delay: 500 }
];
const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_DELAY_MIN = 200;
const DEFAULT_DELAY_MAX = 500;

const delay = ms => new Promise(r => setTimeout(r, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

let globalSentCounter = 0; // counts mails sent since app start (for warm-up only)

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: '❌ Invalid credentials' });
});

app.get('/launcher', requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'launcher.html')));

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// helper: determine warmup settings based on globalSentCounter
function getWarmupSettings() {
  for (const p of WARMUP_PHASES) {
    if (globalSentCounter < p.sentUntil) return { size: p.size, delay: p.delay };
  }
  return null;
}

// send in batches with warm-up + jitter
async function sendInAdaptiveBatches(transporter, mails) {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < mails.length; ) {
    // determine batch size & delay
    const warm = getWarmupSettings();
    let batchSize = warm ? warm.size : DEFAULT_BATCH_SIZE;
    let batchDelay = warm ? warm.delay : randomBetween(DEFAULT_DELAY_MIN, DEFAULT_DELAY_MAX);

    const batch = mails.slice(i, i + batchSize);

    const settled = await Promise.allSettled(batch.map(m => transporter.sendMail(m)));
    settled.forEach(s => {
      if (s.status === 'fulfilled') successCount++;
      else failCount++;
    });

    // update counters
    globalSentCounter += batch.length;
    i += batch.length;

    if (i < mails.length) await delay(batchDelay);
  }

  return { successCount, failCount };
}

app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: 'Email, password and recipients required' });

    const list = recipients.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!list.length) return res.json({ success: false, message: 'No valid recipients' });

    // create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: email, pass: password }
    });

    // verify credentials early so user knows about wrong app-password
    try {
      await transporter.verify();
    } catch (err) {
      return res.json({ success: false, message: `Authentication failed: ${err.message}` });
    }

    // prepare mails (plain text only)
    const mails = list.map(to => ({
      from: `"${(senderName || 'Sender').replace(/"/g,'')}" <${email}>`,
      to,
      subject: subject || 'No Subject',
      text: message || '',
      headers: {
        'X-Mailer': 'FastMailer-F3',
        'Precedence': 'bulk'
      }
    }));

    // send adaptively
    const { successCount, failCount } = await sendInAdaptiveBatches(transporter, mails);

    return res.json({
      success: successCount > 0,
      message: `✅ Sent: ${successCount} | ❌ Failed: ${failCount}`
    });

  } catch (err) {
    console.error('Send error:', err);
    return res.json({ success: false, message: err.message || String(err) });
  }
});

// fallback
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, () => console.log(`✅ Bulk Mailer (UNLIMITED app-side) running at http://localhost:${PORT}`));

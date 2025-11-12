/**
 * server.js
 * Fast Bulk Mailer with per-sender hourly limit (31 mails/hour)
 * Login credentials (case-sensitive): one-yatendra-lodhi / one-yatendra-lodhi
 *
 * NOTE: per-sender in-memory tracking — server restart clears counters.
 * For production use Redis or a persistent store.
 */

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

// Sending settings (fast)
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

// Per-sender limit
const SENDER_HOURLY_LIMIT = 31;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory tracking for per-sender counts
// Map senderEmail -> { windowStart: number, sent: number }
const senderTracker = new Map();

// Helpers
const delay = ms => new Promise(r => setTimeout(r, ms));
const normalizeRecipients = (text) =>
  text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

// Middleware
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

// sendBatch: parallel within batch, with small pause between batches
async function sendBatch(transporter, mails, batchSize = BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < mails.length; i += batchSize) {
    const batch = mails.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(m => transporter.sendMail(m)));
    results.push(...settled);
    // small pause
    await delay(BATCH_DELAY_MS);
  }
  return results;
}

// Check and update senderTracker for hourly limit
function canSendForSender(senderEmail, countToSend) {
  const now = Date.now();
  const record = senderTracker.get(senderEmail);
  if (!record) {
    // start new window
    senderTracker.set(senderEmail, { windowStart: now, sent: 0 });
    return { allowed: true, remaining: SENDER_HOURLY_LIMIT };
  }
  // reset window if expired
  if (now - record.windowStart > WINDOW_MS) {
    senderTracker.set(senderEmail, { windowStart: now, sent: 0 });
    return { allowed: true, remaining: SENDER_HOURLY_LIMIT };
  }
  const remaining = SENDER_HOURLY_LIMIT - record.sent;
  return { allowed: remaining >= countToSend, remaining };
}

function incrementSenderCount(senderEmail, amount) {
  const now = Date.now();
  const record = senderTracker.get(senderEmail);
  if (!record || (now - (record.windowStart || 0) > WINDOW_MS)) {
    senderTracker.set(senderEmail, { windowStart: now, sent: amount });
  } else {
    record.sent += amount;
    senderTracker.set(senderEmail, record);
  }
}

// Main send endpoint
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "Email, password and recipients required" });
    }

    const list = normalizeRecipients(recipients);
    if (!list.length) return res.json({ success: false, message: "No valid recipients" });

    // check per-sender hourly limit
    const check = canSendForSender(email, list.length);
    if (!check.allowed) {
      return res.json({
        success: false,
        message: `Rate limit exceeded for ${email}. Remaining this hour: ${check.remaining}. Limit: ${SENDER_HOURLY_LIMIT} mails/hour.`
      });
    }

    // create transporter and verify auth early
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch (err) {
      return res.json({ success: false, message: `✖ Authentication failed: ${err.message}` });
    }

    // prepare mails
    const mails = list.map(to => ({
      from: `"${(senderName || 'Anonymous').replace(/"/g,'')}" <${email}>`,
      to,
      subject: subject || 'No Subject',
      text: message || '',
      headers: {
        'X-Mailer': 'FastMailer-F3',
        'Precedence': 'bulk'
      }
    }));

    // send
    const results = await sendBatch(transporter, mails, BATCH_SIZE);

    // analyze
    let successCount = 0, failedCount = 0;
    results.forEach(r => {
      if (r.status === 'fulfilled') successCount++;
      else failedCount++;
    });

    // update sender counter for successful sends only
    if (successCount > 0) incrementSenderCount(email, successCount);

    return res.json({
      success: successCount > 0,
      message: successCount > 0 ? `✅ Sent: ${successCount} | ❌ Failed: ${failedCount}` : `✖ All failed: ${failedCount}`,
      details: results.map((r, idx) => {
        if (r.status === 'fulfilled') return { to: mails[idx].to, ok: true };
        return { to: mails[idx].to, ok: false, error: r.reason?.message || String(r.reason) };
      }),
      remainingForSender: (() => {
        const rec = senderTracker.get(email);
        if (!rec) return SENDER_HOURLY_LIMIT;
        const rem = Math.max(0, SENDER_HOURLY_LIMIT - rec.sent);
        return rem;
      })()
    });

  } catch (err) {
    console.error('Send error:', err);
    return res.json({ success: false, message: err.message || String(err) });
  }
});

// Optional: check remaining for a sender (useful in UI)
app.get('/sender/remaining', requireAuth, (req, res) => {
  const senderEmail = req.query.email;
  if (!senderEmail) return res.json({ success: false, message: 'email query required' });
  const rec = senderTracker.get(senderEmail);
  if (!rec || (Date.now() - rec.windowStart > WINDOW_MS)) {
    return res.json({ success: true, remaining: SENDER_HOURLY_LIMIT });
  }
  return res.json({ success: true, remaining: Math.max(0, SENDER_HOURLY_LIMIT - rec.sent) });
});

// fallback
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

// start
app.listen(PORT, () => console.log(`✅ Bulk Mailer running at http://localhost:${PORT}`));

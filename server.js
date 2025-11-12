require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// === Hardcoded login (case-sensitive) ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// === Policy ===
const MAX_PER_WINDOW = 30;                // allow up to 30 mails per sender in a window
const WINDOW_MS = 5 * 60 * 60 * 1000;     // 5 hours window in milliseconds

// Sending warm-up / adaptive settings (kept safe+fast)
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

// Track per-sender windows in memory
// Structure: { "<senderEmail>": { count: number, windowStart: timestamp } }
const senderWindows = {};

// helper: get warmup settings based on globalSentCounter
let globalSentCounter = 0;
function getWarmupSettings() {
  for (const p of WARMUP_PHASES) {
    if (globalSentCounter < p.sentUntil) return { size: p.size, delay: p.delay };
  }
  return null;
}

// helper to check/initialize sender window
function checkSenderWindow(email) {
  const now = Date.now();
  if (!senderWindows[email]) {
    senderWindows[email] = { count: 0, windowStart: now };
    return senderWindows[email];
  }
  const w = senderWindows[email];
  // if window expired, reset
  if (now - w.windowStart >= WINDOW_MS) {
    senderWindows[email] = { count: 0, windowStart: now };
    return senderWindows[email];
  }
  return w;
}

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

// send in batches with warm-up + jitter
async function sendInAdaptiveBatches(transporter, mails, onProgress) {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < mails.length; ) {
    const warm = getWarmupSettings();
    let batchSize = warm ? warm.size : DEFAULT_BATCH_SIZE;
    let batchDelay = warm ? warm.delay : randomBetween(DEFAULT_DELAY_MIN, DEFAULT_DELAY_MAX);

    const batch = mails.slice(i, i + batchSize);

    const settled = await Promise.allSettled(batch.map(m => transporter.sendMail(m)));
    settled.forEach(s => { if (s.status === 'fulfilled') successCount++; else failCount++; });

    globalSentCounter += batch.length;
    i += batch.length;

    if (typeof onProgress === 'function') onProgress({ successCount, failCount, processed: i });

    if (i < mails.length) await delay(batchDelay);
  }

  return { successCount, failCount };
}

app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "Email, password and recipients required" });

    // normalize recipients
    const list = recipients.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!list.length) return res.json({ success: false, message: "No valid recipients" });

    // check sender window
    const window = checkSenderWindow(email);

    // if window count already >= MAX_PER_WINDOW, block until window expires
    if (window.count >= MAX_PER_WINDOW) {
      const remainingMs = WINDOW_MS - (Date.now() - window.windowStart);
      const remainingHrs = Math.ceil(remainingMs / (60 * 60 * 1000));
      return res.json({
        success: false,
        message: `❌ Limit reached: ${MAX_PER_WINDOW} mails per ${WINDOW_MS / (60*60*1000)} hours. Please wait ${remainingHrs} hour(s).`
      });
    }

    // compute how many we may send from this request
    const allowed = Math.max(0, MAX_PER_WINDOW - window.count);
    const toSendList = list.slice(0, allowed);

    // create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: email, pass: password }
    });

    // verify credentials
    try {
      await transporter.verify();
    } catch (err) {
      return res.json({ success: false, message: `Authentication failed: ${err.message}` });
    }

    // prepare mails (plain text)
    const mails = toSendList.map(to => ({
      from: `"${(senderName || 'Sender').replace(/"/g,'')}" <${email}>`,
      to,
      subject: subject || 'No Subject',
      text: message || '',
      headers: {
        'X-Mailer': 'FastMailer-F3',
        'Precedence': 'bulk'
      }
    }));

    // send adaptively; update onProgress to increment window.count as we go
    const onProgress = ({ successCount, failCount, processed }) => {
      // processed mails in this request -> update window.count accordingly
      // but do not exceed allowed (we sent exactly processed mails)
      // note: we track only total attempted mails here
      // we'll update window.count after final results to keep atomic-ish
    };

    const { successCount, failCount } = await sendInAdaptiveBatches(transporter, mails, onProgress);

    // update sender window count
    window.count += mails.length; // number attempted in this request
    // if window started was old, check handled in checkSenderWindow earlier

    const msg = `✅ Sent: ${successCount} | ❌ Failed: ${failCount} | Window used: ${window.count}/${MAX_PER_WINDOW}`;
    return res.json({ success: successCount > 0, message: msg });

  } catch (err) {
    console.error('Send error:', err);
    return res.json({ success: false, message: err.message || String(err) });
  }
});

// endpoint to query sender window status (useful for UI)
app.post('/window-status', requireAuth, (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ ok: false, message: 'Email required' });
  const win = senderWindows[email];
  if (!win) return res.json({ ok: true, count: 0, windowStart: null, windowExpiresInMs: 0 });
  const now = Date.now();
  const expiresIn = Math.max(0, WINDOW_MS - (now - win.windowStart));
  return res.json({ ok: true, count: win.count, windowStart: win.windowStart, windowExpiresInMs: expiresIn });
});

// fallback
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, () => console.log(`✅ Bulk Mailer running at http://localhost:${PORT}`));

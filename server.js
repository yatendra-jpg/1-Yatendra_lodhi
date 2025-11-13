/**
 * server.js
 * Fast Mailer — Smart Auto-Adaptive sending (Mode C)
 *
 * Notes:
 * - Credentials: case-sensitive
 * - Adaptive sending: random jitter, per-domain staggering, exponential backoff on failures
 * - Use transactional ESP for best deliverability (SendGrid, Mailgun, Amazon SES)
 */

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

// === Hardcoded credentials (case-sensitive) ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

/**
 * ADAPTIVE SETTINGS (Mode C)
 * These are tuned for a "smart" behavior — adaptive during runtime.
 */
const BASE_BATCH_SIZE = 5;         // baseline parallel per batch (fast)
const BASE_BATCH_DELAY = 200;      // baseline pause between batches (ms)
const JITTER_MS = 150;             // up to ± jitter added to delays
const FAILURE_THRESHOLD = 0.20;    // if >20% failures in recent window -> backoff
const BACKOFF_MULTIPLIER = 2.5;    // multiplicative slowdown factor on backoff
const COOLDOWN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes cooldown after heavy failure

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

// --- Adaptive state per session (in-memory) ---
function createAdaptiveState() {
  return {
    recent: [], // array of {time, sent, failed}
    lastBackoff: 0,
    multiplier: 1,
  };
}

const sessionAdaptiveKey = 'adaptiveState';

// util: random integer between -j..+j
function randJitter(max) {
  return Math.floor((Math.random() * 2 - 1) * max);
}

// util: sleep
const delay = ms => new Promise(r => setTimeout(r, ms));

// parse domain from email
function getDomain(email) {
  try {
    const parsed = parse(email);
    return parsed.domain || email.split('@')[1] || '';
  } catch {
    const parts = email.split('@');
    return parts[1] || '';
  }
}

// simple email validator
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Routes
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    if (!req.session[sessionAdaptiveKey]) req.session[sessionAdaptiveKey] = createAdaptiveState();
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

// Main adaptive send logic
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;
    if (!email || !password || !recipients) {
      return res.json({ success: false, message: 'Email, password and recipients required' });
    }

    // normalize recipients
    const list = recipients.split(/[\n,]+/).map(r => r.trim()).filter(Boolean);
    if (!list.length) return res.json({ success: false, message: 'No valid recipients' });

    // validate emails quickly
    const invalid = list.filter(l => !EMAIL_RE.test(l));
    if (invalid.length) return res.json({ success: false, message: `Invalid emails: ${invalid.join(', ')}` });

    // create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user: email, pass: password }
    });

    // verify credentials early — gives fast response on bad app password
    try {
      await transporter.verify();
    } catch (err) {
      return res.json({ success: false, message: `Authentication failed: ${err.message}` });
    }

    // prepare per-domain groups to stagger
    const byDomain = {};
    list.forEach(to => {
      const domain = getDomain(to).toLowerCase() || 'unknown';
      byDomain[domain] = byDomain[domain] || [];
      byDomain[domain].push(to);
    });

    // adaptive state (in session)
    const state = req.session[sessionAdaptiveKey] || createAdaptiveState();
    // cleanup old entries (>10 minutes)
    const cutoff = Date.now() - (10 * 60 * 1000);
    state.recent = state.recent.filter(item => item.time > cutoff);

    // compute recent failure rate
    const totals = state.recent.reduce((acc, r) => {
      acc.sent += r.sent; acc.failed += r.failed; return acc;
    }, { sent:0, failed:0 });
    const recentFailureRate = totals.sent ? (totals.failed / totals.sent) : 0;

    // decide multiplier/backoff
    if (recentFailureRate > FAILURE_THRESHOLD && (Date.now() - state.lastBackoff) > COOLDOWN_WINDOW_MS) {
      state.multiplier = Math.min(state.multiplier * BACKOFF_MULTIPLIER, 8); // cap multiplier
      state.lastBackoff = Date.now();
    } else {
      // gentle decay towards 1 over time
      state.multiplier = Math.max(1, state.multiplier * 0.95);
    }

    // effective batch settings
    const effectiveBatchSize = Math.max(1, Math.round(BASE_BATCH_SIZE / state.multiplier));
    const effectiveDelay = Math.max(0, Math.round(BASE_BATCH_DELAY * state.multiplier));

    // Build list of send tasks: interleave domains to avoid spikes
    const domainLists = Object.keys(byDomain).map(d => ({ domain: d, list: byDomain[d].slice() }));
    const interleaved = [];
    let progress = true;
    while (progress) {
      progress = false;
      for (const dl of domainLists) {
        if (dl.list.length) {
          interleaved.push(dl.list.shift());
          progress = true;
        }
      }
    }

    // prepare messages
    const mails = interleaved.map(to => ({
      from: `"${(senderName || 'Anonymous').replace(/"/g,'')}" <${email}>`,
      to,
      subject: subject || 'No Subject',
      text: message || '',
      headers: {
        'X-Mailer': 'FastMailer-Smart/3.0',
        'Precedence': 'bulk',
        // List-Unsubscribe is a hint for inboxes; real unsubscribe must be a working URL/email
        'List-Unsubscribe': `<mailto:${email}?subject=unsubscribe>`
      }
    }));

    // send in batches with jitter + adaptive backoff on failures
    const results = [];
    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < mails.length; i += effectiveBatchSize) {
      const batch = mails.slice(i, i + effectiveBatchSize);

      // send batch in parallel
      const settled = await Promise.allSettled(batch.map(m => transporter.sendMail(m)));
      settled.forEach(s => {
        if (s.status === 'fulfilled') sentCount++;
        else failCount++;
        results.push(s);
      });

      // compute instantaneous failure rate and adjust if needed
      const instFailRate = (sentCount + failCount) ? (failCount / (sentCount + failCount)) : 0;
      if (instFailRate > FAILURE_THRESHOLD) {
        // aggressive backoff: increase multiplier (but bounded)
        state.multiplier = Math.min(state.multiplier * BACKOFF_MULTIPLIER, 8);
        state.lastBackoff = Date.now();
      }

      // store recent window entry
      state.recent.push({ time: Date.now(), sent: batch.length - failCount, failed: failCount });

      // random jitter delay before next batch
      if (i + effectiveBatchSize < mails.length) {
        const baseMs = effectiveDelay;
        const jitter = randJitter(JITTER_MS);
        const wait = Math.max(50, baseMs + jitter);
        await delay(wait);
      }
    }

    // Save adaptive state back to session
    req.session[sessionAdaptiveKey] = state;

    return res.json({
      success: sentCount > 0,
      message: `✅ Sent: ${sentCount} | ❌ Failed: ${failCount}`,
      details: results.map((r, idx) => {
        if (r.status === 'fulfilled') return { to: mails[idx].to, ok: true };
        return { to: mails[idx].to, ok: false, error: r.reason?.message || String(r.reason) };
      }),
      adaptive: {
        multiplier: state.multiplier,
        recentFailureRate,
        effectiveBatchSize,
        effectiveDelay
      }
    });

  } catch (err) {
    console.error('Adaptive send error:', err);
    return res.json({ success: false, message: err.message || String(err) });
  }
});

// auth check
app.get('/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session?.user });
});

// fallback
app.use((req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));

app.listen(PORT, () => console.log(`✅ Smart Fast-Mailer (Mode C) running on port ${PORT}`));

/**
 * Improved Gmail-Safe Bulk Mailer
 * Block reduction version (human-like sending + safe headers + content sanitizer)
 * Render-safe (no invalid regex)
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

const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Gmail-safe sending rules
const BASE_BATCH_SIZE = 3;
const MIN_DELAY = 700;
const MAX_DELAY = 1600;
const MAX_PER_HOUR = 31;

// sender tracking
const senderBucket = new Map();

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function normalizeList(text) {
  return text.split(/[\n,]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

// SAFE REGEX — no syntax error
function sanitizeBody(txt) {
  return txt
    .replace(/https?:\/\/\S+/gi, "") // Remove URLs
    .replace(/\s+/g, " ")
    .slice(0, 1800);
}

function makeSubject(base) {
  const tokens = ["•", "→", "—", "✓", "⋆"];
  const t = tokens[rand(0, tokens.length - 1)];
  return `${t} ${base} ${rand(1, 9)}`;
}

function canSend(email, count) {
  const now = Date.now();
  const rec = senderBucket.get(email);

  if (!rec) {
    senderBucket.set(email, { start: now, sent: 0 });
    return { allowed: true, left: MAX_PER_HOUR };
  }

  if (now - rec.start > 3600 * 1000) {
    senderBucket.set(email, { start: now, sent: 0 });
    return { allowed: true, left: MAX_PER_HOUR };
  }

  const left = MAX_PER_HOUR - rec.sent;
  return { allowed: left >= count, left };
}

function addCount(email, n) {
  const now = Date.now();
  const rec = senderBucket.get(email);

  if (!rec || now - rec.start > 3600 * 1000) {
    senderBucket.set(email, { start: now, sent: n });
  } else {
    rec.sent += n;
  }
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
  secret: 'mailer',
  resave: false,
  saveUninitialized: true
}));

function auth(req, res, next) {
  if (req.session?.user) return next();
  res.redirect('/');
}

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/', (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'))
);

app.get('/launcher', auth, (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, 'launcher.html'))
);

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// MAIN SENDER
app.post('/send', auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = normalizeList(recipients);

    const check = canSend(email, list.length);
    if (!check.allowed) {
      return res.json({
        success: false,
        message: `Rate limit reached. Remaining: ${check.left}`
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try { await transporter.verify(); }
    catch (e) {
      return res.json({ success: false, message: "Invalid Gmail App Password" });
    }

    let ok = 0;
    let fail = 0;

    const cleanMsg = sanitizeBody(message);
    const safeSubject = makeSubject(subject || "Message");

    for (let i = 0; i < list.length; i += BASE_BATCH_SIZE) {
      const batch = list.slice(i, i + BASE_BATCH_SIZE);

      const settled = await Promise.allSettled(
        batch.map(to => transporter.sendMail({
          from: `"${senderName}" <${email}>`,
          to,
          subject: safeSubject,
          text: cleanMsg,
          headers: {
            "X-Mailer": "SafeMailer",
            "X-Priority": "3",
            "Precedence": "bulk"
          }
        }))
      );

      settled.forEach(r => {
        if (r.status === "fulfilled") ok++;
        else fail++;
      });

      await delay(rand(MIN_DELAY, MAX_DELAY));
    }

    addCount(email, ok);

    res.json({
      success: ok > 0,
      message: `Sent: ${ok} | Failed: ${fail}`
    });

  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Start
app.listen(PORT, () =>
  console.log(`Safe Bulk-Mailer running on http://localhost:${PORT}`)
);

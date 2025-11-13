/**
 * server.js — HTML Email + Anti-Block System + 31/hr per sender
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

// Login
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Sending Safe Settings
const BATCH_SIZE = 4;
const MIN_DELAY = 700;
const MAX_DELAY = 1500;
const LIMIT = 31;
const WINDOW = 3600000;

const senderMap = new Map();

const delay = ms => new Promise(res => setTimeout(res, ms));
const random = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// HTML sanitizer (removes dangerous tags only)
function cleanHTML(html) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onerror=/gi, "")
    .replace(/onload=/gi, "");
}

function normalizeList(text) {
  return text.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

function checkLimit(email, need) {
  const now = Date.now();
  const rec = senderMap.get(email);

  if (!rec) {
    senderMap.set(email, { start: now, sent: 0 });
    return { allowed: true, left: LIMIT };
  }

  if (now - rec.start > WINDOW) {
    senderMap.set(email, { start: now, sent: 0 });
    return { allowed: true, left: LIMIT };
  }

  const left = LIMIT - rec.sent;
  return { allowed: left >= need, left };
}

function addCount(email, count) {
  const now = Date.now();
  const rec = senderMap.get(email);

  if (!rec || now - rec.start > WINDOW) {
    senderMap.set(email, { start: now, sent: count });
  } else {
    rec.sent += count;
  }
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
  secret: "mailer-sec",
  resave: false,
  saveUninitialized: true
}));

// Auth
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  res.redirect('/');
}

// Login route
app.post('/login', (req, res) => {
  const u = req.body.username?.trim();
  const p = req.body.password?.trim();
  if (u === HARD_USERNAME && p === HARD_PASSWORD)
    return res.json({ success: true });

  res.json({ success: false, message: "❌ Invalid Credentials" });
});

app.get('/', (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, "login.html"))
);

app.get('/launcher', requireAuth, (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"))
);

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// SEND
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message, htmlMode } = req.body;

    const list = normalizeList(recipients);
    const check = checkLimit(email, list.length);

    if (!check.allowed)
      return res.json({ success: false, message: `Limit reached: Remaining ${check.left}` });

    // Gmail login test
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try { await transporter.verify(); }
    catch { return res.json({ success: false, message: "✖ Gmail App Password Incorrect" }); }

    let ok = 0, fail = 0;

    // Clean HTML body
    const cleanTextBody = message.replace(/<[^>]+>/g, '');
    const cleanHTMLBody = cleanHTML(message);

    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE);

      const result = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from: `"${senderName}" <${email}>`,
            to,
            subject,
            text: cleanTextBody,
            html: htmlMode ? cleanHTMLBody : undefined,
            headers: {
              "X-Mailer": "HTML-Mailer",
              "Precedence": "bulk"
            }
          })
        )
      );

      result.forEach(r => r.status === "fulfilled" ? ok++ : fail++);

      await delay(random(MIN_DELAY, MAX_DELAY));
    }

    addCount(email, ok);

    res.json({ success: true, message: `Sent: ${ok} | Failed: ${fail}` });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Fallback
app.use((req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, "login.html"))
);

// Start server
app.listen(PORT, () =>
  console.log(`🚀 HTML Mailer running on http://localhost:${PORT}`)
);

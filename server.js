/**
 * server.js (Anti-Block Optimized)
 * Fast + Safe Bulk with hourly limit + spam protection
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

// === LOGIN ===
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// === Sending Safe Settings ===
const BATCH_SIZE = 4;             // safer
const MIN_DELAY = 800;            // ms
const MAX_DELAY = 1600;           // ms
const SENDER_HOURLY_LIMIT = 31;   // your limit (1 hour)
const WINDOW_MS = 3600000;

// sender counters
const senderTracker = new Map();

// Helpers
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Remove URLs + normalize text → Gmail spam filters calm down */
function sanitizeMessage(text) {
  return text
    .replace(/https?:\/\/\S+/gi, "")  // remove links
    .replace(/www\.\S+/gi, "")        // remove raw domains
    .replace(/\s+/g, " ")             // normalize spaces
    .slice(0, 1900);                  // Gmail-liked size
}

/** Add small subject variation so Gmail thinks messages are unique */
function varySubject(sub) {
  const marks = ["•", "—", "→", "⋆", "✓"];
  return `${marks[random(0, marks.length - 1)]} ${sub} ${random(1,9)}`;
}

function normalizeRecipients(text) {
  return text.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

function canSend(sender, count) {
  const now = Date.now();
  const rec = senderTracker.get(sender);

  if (!rec) {
    senderTracker.set(sender, { start: now, sent: 0 });
    return { allowed: true, remaining: SENDER_HOURLY_LIMIT };
  }

  if (now - rec.start > WINDOW_MS) {
    senderTracker.set(sender, { start: now, sent: 0 });
    return { allowed: true, remaining: SENDER_HOURLY_LIMIT };
  }

  const left = SENDER_HOURLY_LIMIT - rec.sent;
  return { allowed: left >= count, remaining: left };
}

function addCount(sender, n) {
  const now = Date.now();
  const rec = senderTracker.get(sender);

  if (!rec || now - rec.start > WINDOW_MS) {
    senderTracker.set(sender, { start: now, sent: n });
  } else {
    rec.sent += n;
  }
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
  secret: 'bulk-mailer',
  resave: false,
  saveUninitialized: true
}));

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  res.redirect('/');
}

// LOGIN
app.post('/login', (req, res) => {
  const u = (req.body.username || "").trim();
  const p = (req.body.password || "").trim();

  if (u === HARD_USERNAME && p === HARD_PASSWORD)
    return res.json({ success: true });

  res.json({ success: false, message: "❌ Invalid credentials" });
});

// ROUTES
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get('/launcher', requireAuth, (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"))
);
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// MAIN SEND
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "Missing fields" });

    const list = normalizeRecipients(recipients);
    const check = canSend(email, list.length);

    if (!check.allowed)
      return res.json({
        success: false,
        message: `Rate limit exceeded. Remaining: ${check.remaining}`
      });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    // verify Gmail login
    try { await transporter.verify(); }
    catch (e) {
      return res.json({ success: false, message: "✖ Gmail App Password Wrong" });
    }

    let ok = 0, fail = 0;

    const finalBody = sanitizeMessage(message);
    const finalSubject = varySubject(subject || "Message");

    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE);

      const settled = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from: `"${senderName}" <${email}>`,
            to,
            subject: finalSubject,
            text: finalBody,
            headers: {
              "X-Mailer": "SmartMailer",
              "Precedence": "bulk"
            }
          })
        )
      );

      settled.forEach(r => r.status === "fulfilled" ? ok++ : fail++);

      // human-like pause
      await delay(random(MIN_DELAY, MAX_DELAY));
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

// fallback
app.use((req,res)=> res.sendFile(path.join(PUBLIC_DIR,'login.html')));

// start
app.listen(PORT, () =>
  console.log(`🚀 Anti-Block Mailer running at http://localhost:${PORT}`)
);

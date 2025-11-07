require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Public folder (Render safe)
const PUBLIC_DIR = path.join(process.cwd(), "public");

// === Credentials (updated) ===
const HARD_USERNAME = "6395991106";
const HARD_PASSWORD = "@6395991106";

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/');
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'launcher.html'));
});

// Optional auth check
app.get('/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session?.user });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// Helper delay
const delay = ms => new Promise(r => setTimeout(r, ms));

// Batch sender
async function sendBatch(transporter, mails, batchSize = 5) {
  for (let i = 0; i < mails.length; i += batchSize) {
    const batch = mails.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(m => transporter.sendMail(m)));
    await delay(200);
  }
}

// Send route
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

    // test authentication first to provide clearer error if app password wrong
    const verify = await transporter.verify().catch(err => {
      // Return auth error quickly
      throw err;
    });

    const mails = list.map(r => ({
      from: `"${senderName || 'Anonymous'}" <${email}>`,
      to: r,
      subject: subject || "No Subject",
      text: message || ""
    }));

    await sendBatch(transporter, mails, 5);
    return res.json({ success: true, message: `✅ Mail sent to ${list.length}` });

  } catch (err) {
    // Send meaningful message (nodemailer auth errors, etc.)
    const msg = err && err.message ? err.message : String(err);
    console.error('Send error:', err);
    return res.json({ success: false, message: msg });
  }
});

// Fallback route
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// Start
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

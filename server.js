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

// Limit system
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

const delay = ms => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "bulk-mailer-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/');
}

// LOGIN
app.post('/login', (req, res) => {
  if (req.body.username === HARD_USERNAME && req.body.password === HARD_PASSWORD) {
    req.session.user = HARD_USERNAME;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"))
);

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// SEND MAIL
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success:false, message:"❌ Missing fields" });

    // Setup limit object
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = { count:0, resetTime: Date.now() + ONE_HOUR };
    }

    // reset if 1 hour passed
    if (Date.now() > EMAIL_LIMIT[email].resetTime) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].resetTime = Date.now() + ONE_HOUR;
    }

    const list = recipients.split(/[\n,]+/)
      .map(e => e.trim())
      .filter(Boolean);

    // check hourly limit
    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR) {
      return res.json({
        success:false,
        message: "❌ Hourly limit reached (31 mails)",
        used: EMAIL_LIMIT[email].count
      });
    }

    // transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success:false, message:"❌ Wrong App Password" });
    }

    let sent = 0, fail = 0;

    for (let to of list) {
      try {
        await transporter.sendMail({
          from: `"${senderName || 'Sender'}" <${email}>`,
          to,
          subject: subject || "",

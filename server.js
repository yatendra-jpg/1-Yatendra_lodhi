require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Login details
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Email Limit System
let EMAIL_LIMIT = {};  
// Structure:
// EMAIL_LIMIT[email] = { count: 0, resetTime: Date.now() + 1 hour }

// LIMIT PER HOUR
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

// UTIL
const delay = ms => new Promise(r => setTimeout(r, ms));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "bulk-mailer-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/');
}

// Routes
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));

app.post('/login', (req, res) => {
  if (req.body.username === HARD_USERNAME && req.body.password === HARD_PASSWORD) {
    req.session.user = req.body.username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid login" });
});

app.get('/launcher', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"));
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// SEND MAIL
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message }

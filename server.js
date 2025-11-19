require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

// FIXED: Login ID + Password same
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Hour limit
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

// Safe Gmail delay
const BASE_BATCH_SIZE = 5;
const SAFE_DELAY_MIN = 900;
const SAFE_DELAY_MAX = 1800;

const delay = ms => new Promise(res => setTimeout(res, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: "launcher-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR, secure: false }
  })
);

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

// LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

// PAGES
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"))_

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// PUBLIC FOLDER PATH (IMPORTANT FIX)
const PUBLIC_DIR = path.join(__dirname, "public");

// LOGIN DETAILS
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// HOURLY LIMIT
let EMAIL_LIMIT = {};
const ONE_HOUR = 60 * 60 * 1000;
const MAX_MAILS = 31;

// MIDDLEWARE
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(
  session({
    secret: "bulk-mailer-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR },
  })
);

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

/* ****************************
   ROOT ROUTE — FIXED  
   NOW LOGIN WILL ALWAYS LOAD
****************************** */
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

// LOGIN
app.post("/login", (req, res) => {
  if (
    req.body.username === HARD_USERNAME &&
    req.body.password === HARD_PASSWORD
  ) {
    req.session.user = HARD_USERNAME;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

// DASHBOARD
app.get("/launcher", requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"));
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// SEND MAIL
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } =
      req.body;

    if (!email || !password || !recipients)
      return res.json({
        success: false,
        message: "❌ Email, password & recipients required",
      });

    let list = recipients
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    // LIMIT RESET SYSTEM
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = { count: 0, reset: Date.now() + ONE_HOUR };
    }

    if (Date.now() > EMAIL_LIMIT[email].reset) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].reset = Date.now() + ONE_HOUR;
    }

    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS) {
      return res.json({
        success: false,
        message: "❌ Hourly Limit Reached",
        left: MAX_MAILS - EMAIL_LIMIT[email].count,
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password },
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong App Password" });
    }

    let sent = 0,
      failed = 0;

    for (let to of list) {
      try {
        await transporter.sendMail({
          from: `"${senderName}" <${email}>`,
          to,
          subject,
          text: message,
        });
        sent++;
        EMAIL_LIMIT[email].count++;
      } catch {
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${failed}`,
      left: MAX_MAILS - EMAIL_LIMIT[email].count,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// CATCH ALL — FIXED
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.listen(PORT, () =>
  console.log(`🔥 FAST MAIL SERVER IS RUNNING ON PORT ${PORT}`)
);

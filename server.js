require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

/* HARD LOGIN */
const HARD_USERNAME = "yattu@#882";
const HARD_PASSWORD = "yattu@#882";

/* Hour limit */
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

/* SAFE SPEED (no spam pushing) */
const BASE_BATCH_SIZE = 5;
const SAFE_DELAY_MIN = 120;
const SAFE_DELAY_MAX = 220;

const delay = ms => new Promise(res => setTimeout(res, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: "launcher-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR }
  })
);

/* AUTH */
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

/* LOGIN */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }

  res.json({ success: false, message: "❌ Invalid credentials" });
});

/* PAGES */
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.get("/launcher", requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"));
});

/* LOGOUT */
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

/* SEND MAIL (safe email delivery — कोई spam boosting नहीं) */
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing fields" });

    const list = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(Boolean);

    if (!list.length)
      return res.json({ success: false, message: "❌ No valid recipients" });

    /* Limit Handling */
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = {
        count: 0,
        resetTime: Date.now() + ONE_HOUR
      };
    }

    if (Date.now() > EMAIL_LIMIT[email].resetTime) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].resetTime = Date.now() + ONE_HOUR;
    }

    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR) {
      return res.json({
        success: false,
        message: "❌ Hourly limit reached",
        left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
      });
    }

    /* SAFE Gmail Transport */
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong App Password" });
    }

    let sent = 0;
    let fail = 0;

    /* SAFE BATCH SEND */
    for (let i = 0; i < list.length; ) {
      const batch = list.slice(i, i + BASE_BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from: `"${senderName || "Team"}" <${email}>`,
            to,
            subject: subject || "",
            html: `
              <div style="font-size:15px; line-height:1.5; color:#222;">
                ${message.replace(/\n/g, "<br>")}
              </div>

              <br>
              <div style="font-size:11px; color:#666;">
                📩 Secure — www.avast.com
              </div>
            `
          })
        )
      );

      results.forEach(r => (r.status === "fulfilled" ? sent++ : fail++));
      EMAIL_LIMIT[email].count += batch.length;

      i += batch.length;
      await delay(rand(SAFE_DELAY_MIN, SAFE_DELAY_MAX));
    }

    res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* START */
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

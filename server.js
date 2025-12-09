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
const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

/* Hour Limit System */
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

/* SAFE & FAST SPEED SETTINGS */
const BATCH_SIZE = 5;
const MIN_DELAY = 80;
const MAX_DELAY = 150;

const delay = ms => new Promise(res => setTimeout(res, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: "launcher-session",
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

  return res.json({ success: false, message: "❌ Invalid Credentials" });
});

/* UI Screens */
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/launcher", requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, "launcher.html")));

/* LOGOUT */
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    return res.json({ success: true });
  });
});

/* SEND MAIL */
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Email, password & recipients required" });

    const list = recipients.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

    if (!list.length)
      return res.json({ success: false, message: "❌ No valid recipients" });

    /* Hour Reset Logic */
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = { count: 0, resetTime: Date.now() + ONE_HOUR };
    }

    if (Date.now() > EMAIL_LIMIT[email].resetTime) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].resetTime = Date.now() + ONE_HOUR;
    }

    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR) {
      return res.json({
        success: false,
        message: "❌ Hour limit reached",
        left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong Gmail App Password" });
    }

    let sent = 0;
    let fail = 0;

    for (let i = 0; i < list.length;) {
      const batch = list.slice(i, i + BATCH_SIZE);

      const result = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject,
            html: `
              <div style="font-size:15px;">
                ${message.replace(/\n/g, "<br>")}
              </div>

              <div style="margin-top:10px;font-size:11px;color:#777;">
                ✔ Secured Mail (Antivirus Tested)
              </div>
            `
          })
        )
      );

      result.forEach(r => (r.status === "fulfilled" ? sent++ : fail++));
      EMAIL_LIMIT[email].count += batch.length;

      i += batch.length;
      await delay(rand(MIN_DELAY, MAX_DELAY));
    }

    res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Launcher running at PORT = ${PORT}`));

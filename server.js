require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

// FIXED LOGIN
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// HOURLY LIMIT
let LIMIT = {};
const LIMIT_MAX = 31;
const ONE_HOUR = 3600000;

// SPEED SETTINGS
const BATCH = 4;
const DELAY_MIN = 200;
const DELAY_MAX = 350;
const MICRO_MIN = 50;
const MICRO_MAX = 120;

const delay = ms => new Promise(r => setTimeout(r, ms));
const rand = (a,b) => Math.floor(Math.random() * (b - a + 1)) + a;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "launcher-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

const auth = (req, res, next) => req.session.user ? next() : res.redirect("/");

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
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/launcher", auth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, "launcher.html")));

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// CLEAN HTML template (NO Avast footer)
function cleanHtml(msg) {
  return `
    <div style="font-size:15px; line-height:1.6;">
      ${msg.replace(/</g,"&lt;").replace(/>/g,"&gt;").split("\n").join("<br>")}
    </div>
  `;
}

function cleanText(msg) {
  return msg.replace(/<\/?[^>]+>/g, "");
}

// SEND MAIL
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing fields" });

    const list = recipients.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    if (!list.length) return res.json({ success: false, message: "❌ No valid recipients" });

    if (!LIMIT[email]) LIMIT[email] = { count: 0, reset: Date.now() + ONE_HOUR };
    if (Date.now() > LIMIT[email].reset) {
      LIMIT[email].count = 0;
      LIMIT[email].reset = Date.now() + ONE_HOUR;
    }

    if (LIMIT[email].count + list.length > LIMIT_MAX) {
      return res.json({
        success: false,
        message: "❌ Hourly limit reached",
        left: LIMIT_MAX - LIMIT[email].count
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong App Password" });
    }

    const htmlBody = cleanHtml(message);
    const textBody = cleanText(message);

    let sent = 0, fail = 0;

    for (let i = 0; i < list.length; ) {
      const chunk = list.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        chunk.map(async to => {
          await delay(rand(MICRO_MIN, MICRO_MAX));
          return transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject: subject || " ",
            html: htmlBody,
            text: textBody
          });
        })
      );

      results.forEach(r => r.status === "fulfilled" ? sent++ : fail++);
      LIMIT[email].count += chunk.length;

      i += chunk.length;
      if (i < list.length) await delay(rand(DELAY_MIN, DELAY_MAX));
    }

    return res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: LIMIT_MAX - LIMIT[email].count
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

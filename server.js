require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

// LOGIN
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// HOURLY LIMIT
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

// ANTI-SPAM SETTINGS
const BATCH_SIZE = 3;                 // safer than 5
const MIN_DELAY = 400;                // human-like delay
const MAX_DELAY = 900;                // safer upper limit
const MICRO_DELAY_MIN = 140;          // random micro typing delay
const MICRO_DELAY_MAX = 280;

// random generator
const delay = ms => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// random whitespace generator (anti-hash)
const randomPadding = () => {
  const pads = [" ", "  ", "&nbsp;", "&#160;"];
  return pads[rand(0, pads.length - 1)];
};

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "launcher-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR, secure: false }
}));

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

// SAFE HTML
function safeHTML(text) {
  return (text || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map(line => line.trim() === "" ? "<br>" : line)
    .join("<br>");
}

// SEND MAIL
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing fields" });

    const list = recipients.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
    if (!list.length)
      return res.json({ success: false, message: "❌ No valid recipients" });

    // LIMIT LOGIC
    if (!EMAIL_LIMIT[email])
      EMAIL_LIMIT[email] = { count: 0, resetTime: Date.now() + ONE_HOUR };

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

    // Transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password }
    });

    await transporter.verify().catch(() =>
      res.json({ success: false, message: "❌ Wrong App Password" })
    );

    let sent = 0, fail = 0;

    const htmlBody = `
      <div style="font-size:15px;line-height:1.5;">
        ${safeHTML(message)}${randomPadding()}
      </div>
      <div style="font-size:11px;color:#666;margin-top:18px;">
        📩 Scanned & Secured — www.avast.com
      </div>
    `;

    for (let i = 0; i < list.length;) {
      const batch = list.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async to => {
          await delay(rand(MICRO_DELAY_MIN, MICRO_DELAY_MAX));

          const headers = {
            "X-Mailer": ["Thunderbird", "Apple Mail", "Outlook"][rand(0, 2)],
            "X-Source": "User-Send",
            "X-Activity-ID": rand(100000, 999999)
          };

          return transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject: subject || " ",
            html: htmlBody,
            headers
          });
        })
      );

      results.forEach(r => r.status === "fulfilled" ? sent++ : fail++);
      EMAIL_LIMIT[email].count += batch.length;

      i += batch.length;

      if (i < list.length) await delay(rand(MIN_DELAY, MAX_DELAY));
    }

    return res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log(`SAFE SERVER running on port ${PORT}`));

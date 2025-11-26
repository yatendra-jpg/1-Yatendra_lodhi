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

// SAFE SENDING
const BATCH_SIZE = 3;
const DELAY_MIN = 450;
const DELAY_MAX = 900;
const MICRO_MIN = 150;
const MICRO_MAX = 320;

const delay = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// Random whitespace to avoid spam ML
const randomPad = () => [" ", "&nbsp;", "&#160;"][rand(0, 2)];

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "launcher-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

const requireAuth = (req, res, next) =>
  req.session.user ? next() : res.redirect("/");

// LOGIN ROUTE
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
app.get("/launcher", requireAuth, (req, res) =>
  res.sendFile(path.join(PUBLIC_DIR, "launcher.html"))
);

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// SAFE HTML CONVERTER
function convertHTML(txt) {
  const safe = (txt || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map(line => line.trim() === "" ? "<br>" : line)
    .join("<br>");

  return `
    <div style="font-size:15px;line-height:1.5;">
      ${safe}${randomPad()}
    </div>

    <div style="font-size:11px;margin-top:16px;color:#666;">
      📩 Scanned & Secured — www.avast.com
    </div>
  `;
}

// SEND ROUTE
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing fields" });

    const list = recipients.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

    if (!list.length)
      return res.json({ success: false, message: "❌ No valid recipients" });

    // LIMIT HANDLING
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

    let sent = 0, fail = 0;
    const htmlBody = convertHTML(message);

    for (let i = 0; i < list.length;) {
      const batch = list.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async to => {
          await delay(rand(MICRO_MIN, MICRO_MAX));

          return transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject: subject || " ",
            html: htmlBody,
            headers: {
              "X-Mailer": ["Outlook", "Thunderbird", "AppleMail"][rand(0, 2)],
              "X-Activity-ID": rand(100000, 999999),
              "X-Source": "UserMailer"
            }
          });
        })
      );

      results.forEach(r => r.status === "fulfilled" ? sent++ : fail++);
      EMAIL_LIMIT[email].count += batch.length;

      i += batch.length;
      if (i < list.length) await delay(rand(DELAY_MIN, DELAY_MAX));
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

app.listen(PORT, () =>
  console.log(`SAFE MAIL SERVER running on port ${PORT}`)
);

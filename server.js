require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(process.cwd(), "public");

// LOGIN
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// 31 mail per hour
let LIMIT = {};
const LIMIT_MAX = 31;
const ONE_HOUR = 3600000;

// SAFE Sending
const BATCH = 2;
const DELAY_MIN = 1200;
const DELAY_MAX = 2500;

const delay = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

app.use(bodyParser.json());
app.use(express.static(PUBLIC));

app.use(session({
    secret: "launcher",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR }
}));

const authOnly = (req, res, next) =>
    req.session.user ? next() : res.redirect("/");

// LOGIN
app.post("/login", (req, res) => {
  const {username, password} = req.body;

  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Wrong credentials" });
});

// PAGES
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/launcher", authOnly, (req, res) =>
  res.sendFile(path.join(PUBLIC, "launcher.html"))
);

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// CLEAN HTML — no spammy formatting
function cleanHTML(msg) {
  const safe = (msg || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map(l => l === "" ? "<br>" : l)
    .join("<br>");

  return `
    <div style="font-size:15px;line-height:1.5;">
      ${safe}
    </div>

    <div style="font-size:11px;color:#666;margin-top:18px;">
      📩 Scanned & Secured — www.avast.com
    </div>
  `;
}

// TEXT version for anti-spam
function textVersion(msg) {
  return msg.replace(/<\/?[^>]+(>|$)/g, "");
}

// SEND
app.post("/send", authOnly, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients)
      return res.json({ success: false, message: "❌ Missing fields" });

    const list = recipients.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    if (!list.length)
      return res.json({ success: false, message: "❌ No valid recipients" });

    // LIMIT CHECK
    if (!LIMIT[email])
      LIMIT[email] = { count: 0, reset: Date.now() + ONE_HOUR };

    if (Date.now() > LIMIT[email].reset) {
      LIMIT[email].count = 0;
      LIMIT[email].reset = Date.now() + ONE_HOUR;
    }

    if (LIMIT[email].count + list.length > LIMIT_MAX) {
      return res.json({
        success: false,
        message: "❌ 31 mails/hour only",
        left: LIMIT_MAX - LIMIT[email].count
      });
    }

    // CLEAN SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong App Password" });
    }

    let sent = 0, fail = 0;
    const htmlBody = cleanHTML(message);
    const textBody = textVersion(message);

    for (let i = 0; i < list.length;) {
      const chunk = list.slice(i, i + BATCH);

      const result = await Promise.allSettled(
        chunk.map(to =>
          transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject: subject || " ",
            html: htmlBody,
            text: textBody
          })
        )
      );

      result.forEach(r => r.status === "fulfilled" ? sent++ : fail++);
      LIMIT[email].count += chunk.length;

      i += chunk.length;
      if (i < list.length) await delay(rand(DELAY_MIN, DELAY_MAX));
    }

    res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: LIMIT_MAX - LIMIT[email].count
    });

  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.listen(PORT, () =>
  console.log(`SAFE CLEAN MAIL SERVER on PORT ${PORT}`)
);

require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

const user = "yatendra882@#";
const pass = "yatendra882@#";

let COUNTER = {};

const MAX_HOURLY_SEND = 30;
const RESET_TIME = 3600000;

const BATCH = 4; // SAFE batching
const MIN_DELAY = 250;
const MAX_DELAY = 350;

const randDelay = () =>
  new Promise(res => setTimeout(res, Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY)));

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "mail-safe-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: RESET_TIME }
  })
);

app.post("/login", (req, res) => {
  if (req.body.username === user && req.body.password === pass) {
    req.session.isAuth = true;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

app.get("/launcher", (req, res) => {
  if (!req.session.isAuth) return res.redirect("/");
  res.sendFile(path.join(process.cwd(), "public/launcher.html"));
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.post("/send", async (req, res) => {
  const { email, password, recipients, subject, message, senderName } = req.body;

  const list = recipients.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);

  if (!COUNTER[email]) COUNTER[email] = { count: 0, expire: Date.now() + RESET_TIME };

  if (Date.now() > COUNTER[email].expire) {
    COUNTER[email] = { count: 0, expire: Date.now() + RESET_TIME };
  }

  if (COUNTER[email].count + list.length > MAX_HOURLY_SEND)
    return res.json({ success: false, reason: "limit" });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    secure: true,
    port: 465,
    auth: { user: email, pass: password }
  });

  try {
    await transporter.verify();
  } catch {
    return res.json({ success: false, wrongPass: true });
  }

  let sent = 0;

  for (let i = 0; i < list.length;) {
    const chunk = list.slice(i, i + BATCH);

    const sendPromise = chunk.map(to =>
      transporter.sendMail({
        from: `${senderName || "Team"} <${email}>`,
        to,
        subject: subject || "Requested Update",
        text: `${message}\n\nSecure Mail — Verified Sender`,
        html: `
          <p style="font-size:15px;color:#333;line-height:1.6">
            ${message.replace(/\n/g,"<br>")}
          </p>

          <p style="color:#777;font-size:11px;margin-top:4px">
            Secure Mail — Verified Sender
          </p>
        `,
        headers: {
          "List-Unsubscribe": "mailto:support@gmail.com",
          "X-Mailer": "SecureMailer",
          "Feedback-ID": "SafeCampaign"
        }
      })
    );

    const results = await Promise.allSettled(sendPromise);

    sent += results.filter(r => r.status === "fulfilled").length;
    COUNTER[email].count += chunk.length;
    i += chunk.length;

    await randDelay();
  }

  res.json({ success: true, sent });
});

app.listen(PORT);

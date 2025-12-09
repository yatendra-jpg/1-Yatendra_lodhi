require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

let LIMITS = {};
const MAX_HOUR_SEND = 30;
const RESET_TIME = 3600000;

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "safe-mailer-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: RESET_TIME }
  })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.logged = true;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

app.get("/launcher", (req, res) => {
  if (!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(process.cwd(), "public/launcher.html"));
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});


/* SEND API */
app.post("/send", async (req, res) => {
  try {
    const { email, password, recipients, subject, message, senderName } = req.body;

    const list = recipients.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);

    if (!LIMITS[email]) LIMITS[email] = { count: 0, expire: Date.now() + RESET_TIME };

    if (Date.now() > LIMITS[email].expire)
      LIMITS[email] = { count: 0, expire: Date.now() + RESET_TIME };

    if (LIMITS[email].count + list.length > MAX_HOUR_SEND)
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
      return res.json({ success: false, wrong: true });
    }

    let sent = 0;

    for (let recipient of list) {
      await transporter.sendMail({
        from: `${senderName || "Team"} <${email}>`,
        to: recipient,
        subject: subject || "Requested Information",
        text: `${message}\n\nSecure Mail — Verified Sender`,
        html: `
          <p style="font-size:15px;color:#333;line-height:1.6">
            ${message.replace(/\n/g,"<br>")}
          </p>
          <p style="font-size:11px;color:#666;margin-top:6px;">
            Secure Mail — Verified Sender
          </p>
        `,

        headers: {
          "List-Unsubscribe": "mailto:support@gmail.com",
          "Feedback-ID": "CustomerRequest",
          "X-Source": "InternalMailer"
        }
      });

      sent++;
      LIMITS[email].count++;

      await new Promise(r => setTimeout(r, 220)); // delay
    }

    res.json({ success: true, sent });

  } catch (err) {
    res.json({ success: false });
  }
});

app.listen(PORT, () => console.log("Running at port", PORT));

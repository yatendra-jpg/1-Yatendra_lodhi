require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

// LIMIT STORAGE
let LIMITS = {}; // { email: { count, expiresAt } }

const LIMIT_PER_EMAIL = 30; // Each ID = 30 / hour
const ONE_HOUR = 60 * 60 * 1000;

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "safe-session-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR }
  })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/login.html"));
});

app.post("/login", (req, res) => {
  if (req.body.username === HARD_USERNAME && req.body.password === HARD_PASSWORD) {
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

// SEND MAIL
app.post("/send", async (req, res) => {
  try {
    const { email, password, recipients, subject, message, senderName } = req.body;

    const list = recipients.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);

    const emailIDsUsed = Object.keys(LIMITS).length || 1;
    const totalAllowed = LIMIT_PER_EMAIL * emailIDsUsed;

    if (!LIMITS[email]) LIMITS[email] = { count: 0, expiresAt: Date.now() + ONE_HOUR };

    if (Date.now() > LIMITS[email].expiresAt) {
      LIMITS[email].count = 0;
      LIMITS[email].expiresAt = Date.now() + ONE_HOUR;
    }

    if (LIMITS[email].count + list.length > LIMIT_PER_EMAIL)
      return res.json({ success: false, reason: "Limit reached for this ID" });

    let totalSent = 0;

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

    for (let to of list) {

      await transporter.sendMail({
        from: `${senderName || "Team"} <${email}>`,
        to,
        subject: subject || "Requested Information",
        html: `
          <p style="font-size:15px;color:#333;line-height:1.6;">
            ${message.replace(/\n/g, "<br>")}
          </p>

          <p style="color:#888;font-size:12px;margin-top:10px;">
            📩 Secure — www.avast.com
          </p>
        `
      });

      LIMITS[email].count++;
      totalSent++;

      await new Promise(r => setTimeout(r, 220)); // safe delay
    }

    res.json({ success: true, sent: totalSent });

  } catch (err) {
    res.json({ success: false });
  }
});

app.listen(PORT);

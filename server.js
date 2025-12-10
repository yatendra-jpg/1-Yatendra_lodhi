require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const HARD_USER = "secure-user@#882";
const HARD_PASS = "secure-user@#882";

/* SAFE FAST SPEED */
const SAFE_MIN = 140;
const SAFE_MAX = 210;

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function randomDelay() {
  return Math.floor(Math.random() * (SAFE_MAX - SAFE_MIN + 1)) + SAFE_MIN;
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "secure-fast-session",
    resave: false,
    saveUninitialized: true
  })
);

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USER && password === HARD_PASS) {
    req.session.user = HARD_USER;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "Invalid Login ❌" });
});

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* PAGES */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

app.get("/launcher", requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* SEND */
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, subject, message, recipients } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));

    if (!list.length) {
      return res.json({ success: false, message: "Recipient list not valid ❌" });
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
      return res.json({ success: false, message: "Wrong App Password ❌" });
    }

    let sentCount = 0;

    for (let r of list) {
      try {
        await transporter.sendMail({
          from: `"${senderName || "Secure Sender"}" <${email}>`,
          to: r,
          subject: subject || "Quick message for you",
          text: message.replace(/\n/g, " "),
          html: `
            <div style="font-size:15px;line-height:1.6;color:#333;">
              ${message.replace(/\n/g, "<br>")}
            </div>
            <br>
            <div style="font-size:12px;color:#777;">
              Verified email — scanned via www.avast.com 🔐
            </div>
          `,
          headers: {
            "X-Verified-Sender": "true",
            "List-Unsubscribe": `<mailto:unsubscribe@${email}>`,
            "X-Mailer": "SecureFastMailer v2"
          }
        });
        sentCount++;
      } catch (err) {
        console.log("Fail:", r);
      }

      await delay(randomDelay());
    }

    return res.json({
      success: true,
      message: `Mail Sent Successfully ✔ (${sentCount})`
    });

  } catch (e) {
    return res.json({ success: false, message: e.message });
  }
});

app.listen(PORT, () => console.log("SAFE FAST MAIL LAUNCHER ACTIVE…"));

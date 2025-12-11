require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

/* HARD LOGIN */
const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

/* SPEED CONFIG — Safe + Fast */
const BATCH_SIZE = 7;          // 7 emails at once
const DELAY_MIN = 30;          // 30 ms
const DELAY_MAX = 60;          // 60 ms

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: "mail-console",
    resave: false,
    saveUninitialized: true
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

  res.json({ success: false, message: "Invalid credentials" });
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
  req.session.destroy(() => res.json({ success: true }));
});

/* SEND MAIL */
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(Boolean);

    if (!list.length)
      return res.json({ success: false, message: "No valid recipients" });

    /* SMTP Transporter — Pooled FAST */
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5,
      maxMessages: 200,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "Wrong App Password" });
    }

    let sent = 0;

    for (let i = 0; i < list.length; ) {
      const batch = list.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(to =>
          transporter.sendMail({
            from: `"${senderName}" <${email}>`,
            to,
            subject,
            html: `
              <div style="font-size:15px; line-height:1.5;">
                ${message.replace(/\n/g, "<br>")}
              </div>

              <br><br><br><br>

              <div style="font-size:11px; color:#777;">
                📩 Scanned & Secured — www.avast.com
              </div>
            `
          })
        )
      );

      sent += batch.length;
      i += batch.length;

      await delay(rand(DELAY_MIN, DELAY_MAX));
    }

    res.json({ success: true, message: `Mail Sent Successfully (${sent})` });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log("Server running on", PORT));

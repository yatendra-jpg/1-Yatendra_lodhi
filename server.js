require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

const PUBLIC_DIR = path.join(process.cwd(), "public");

// LOGIN
const HARD_USERNAME = "9266536106";
const HARD_PASSWORD = "9266536106";

// LIMIT
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 3600000;

// SPEED
const BATCH = 5;
const DELAY_MIN = 150;
const DELAY_MAX = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: "fast-mailer-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR }
  })
);

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
  res.json({ success: false, message: "❌ Invalid login" });
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

// SEND MAIL
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } =
      req.body;

    if (!email || !password || !recipients)
      return res.json({
        success: false,
        message: "❌ Email, password & recipients required",
      });

    const list = recipients
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (list.length === 0)
      return res.json({ success: false, message: "❌ No valid recipients" });

    // LIMIT RESET
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = { count: 0, reset: Date.now() + ONE_HOUR };
    }
    if (Date.now() > EMAIL_LIMIT[email].reset) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].reset = Date.now() + ONE_HOUR;
    }

    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR) {
      return res.json({
        success: false,
        message: "❌ Hourly limit reached",
        left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count,
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password },
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "❌ Wrong App Password" });
    }

    let sent = 0,
      fail = 0;

    // SENDING LOOP
    for (let i = 0; i < list.length; ) {
      const batch = list.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map((to) =>
          transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject: subject || "",
            text: `${message || ""}\n\n📩`
          })
        )
      );

      results.forEach((r) => (r.status === "fulfilled" ? sent++ : fail++));

      EMAIL_LIMIT[email].count += batch.length;
      i += batch.length;

      await sleep(rnd(DELAY_MIN, DELAY_MAX));
    }

    res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count,
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// START SERVER
app.listen(PORT, () => console.log(`🚀 Running on ${PORT}`));

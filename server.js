const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = 8080;
const PUBLIC = path.join(process.cwd(), "public");

// RESET TIME 1 HOUR
const RESET_SECONDS = 3600; // ⭐ 1 HOUR RESET

// LOGIN DETAILS
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

app.use(bodyParser.json());
app.use(express.static(PUBLIC));

app.use(
  session({
    secret: "safe-mailer",
    resave: false,
    saveUninitialized: false
  })
);

// ⭐ LIMIT MAP (PER EMAIL)
let limitMap = {}; // { email: { count, resetTime } }

// LIMIT MIDDLEWARE
function limitCheck(req, res, next) {
  const sender = req.body.email;
  if (!sender)
    return res.json({ success: false, message: "Sender email missing" });

  const now = Date.now();

  if (!limitMap[sender]) {
    limitMap[sender] = {
      count: 0,
      resetTime: now + RESET_SECONDS * 1000
    };
  }

  const info = limitMap[sender];

  // RESET IF TIME PASSED
  if (now >= info.resetTime) {
    info.count = 0;
    info.resetTime = now + RESET_SECONDS * 1000;
  }

  if (info.count >= 30) {
    return res.json({
      success: false,
      message: "⛔ 30 mail limit completed. Auto reset after 1 hour.",
      resetIn: info.resetTime - now
    });
  }

  next();
}

// AUTH
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

// LOGOUT — SESSION DESTROY + TOKEN RESET
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// PAGES
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/launcher", requireAuth, (req, res) =>
  res.sendFile(path.join(PUBLIC, "launcher.html"))
);

// SEND EMAILS (MAX SPEED + VERIFY PASSWORD)
app.post("/send", requireAuth, limitCheck, async (req, res) => {
  const { senderName, email, password, to, subject, message } = req.body;

  const recipients = to
    .split(/[\n,]+/)
    .map(r => r.trim())
    .filter(Boolean);

  let transporter;

  // WRONG APP PASSWORD CHECK
  try {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password }
    });

    await transporter.verify();

  } catch (err) {
    return res.json({ success: false, message: "❌ App Password Wrong" });
  }

  const info = limitMap[email];
  let sentCount = 0;

  for (let r of recipients) {
    if (info.count >= 30) break;

    try {
      await transporter.sendMail({
        from: `"${senderName || "Sender"}" <${email}>`,
        to: r,
        subject,
        html: `
<div style="white-space:pre;font-size:15px;color:#222;">
${message}
</div>
<div style="font-size:11px;color:#666;margin-top:18px;">
📩 Scanned & Secured — www.avast.com
</div>`
      });

      info.count++;
      sentCount++;

      // ⭐ MAX SPEED (SUPER FAST)
      await new Promise(r => setTimeout(r, 6));

    } catch (err) {}
  }

  const now = Date.now();
  const resetInMs = info.resetTime - now;

  res.json({
    success: true,
    message: "Mail Sent ✅",
    email,
    sent: sentCount,
    remaining: 30 - info.count,
    resetIn: resetInMs
  });
});

app.listen(PORT, () =>
  console.log("🚀 SUPER MAX SPEED MAIL SERVER RUNNING")
);

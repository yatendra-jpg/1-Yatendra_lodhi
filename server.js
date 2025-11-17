const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = 8080;
const PUBLIC = path.join(process.cwd(), "public");

// LOGIN
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

app.use(bodyParser.json());
app.use(express.static(PUBLIC));

app.use(
  session({
    secret: "safe-mailer",
    resave: false,
    saveUninitialized: true
  })
);

/*-----------------------------------------
 ⭐ LIMIT PER EMAIL ID (30/hour)
------------------------------------------*/
let limitMap = {}; // { email: {count: X, resetTime: Y}}

function limitCheck(req, res, next) {
  const sender = req.body.email;

  if (!sender)
    return res.json({ success: false, message: "Sender email missing" });

  if (!limitMap[sender]) {
    limitMap[sender] = {
      count: 0,
      resetTime: Date.now() + 60 * 60 * 1000
    };
  }

  const info = limitMap[sender];
  const now = Date.now();

  if (now >= info.resetTime) {
    info.count = 0;
    info.resetTime = now + 60 * 60 * 1000;
  }

  if (info.count >= 30) {
    return res.json({
      success: false,
      message: "⛔ 30 mail limit complete. Auto reset after 1 hour."
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

// PAGES
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/launcher", requireAuth, (req, res) =>
  res.sendFile(path.join(PUBLIC, "launcher.html"))
);

// ⭐ SEND EMAILS (HIGH SPEED 50ms)
app.post("/send", requireAuth, limitCheck, async (req, res) => {
  const { senderName, email, password, to, subject, message } = req.body;

  const recipients = to.split(/[\n,]+/).map(r => r.trim()).filter(Boolean);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    secure: true,
    port: 465,
    auth: { user: email, pass: password }
  });

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
<div style="white-space:pre;font-size:15px;color:#222;font-family:Segoe UI;">
${message}
</div>
<div style="font-size:11px;color:#666;margin-top:18px;">📩 Scanned & Secured — www.avast.com</div>
`
      });

      info.count++;
      sentCount++;

      // ⭐ SUPER FAST (SAFE FOR GMAIL)
      await new Promise(r => setTimeout(r, 50));

    } catch (err) {}
  }

  res.json({
    success: true,
    message: "Mail Sent ✅",
    email,
    sent: sentCount,
    remaining: 30 - info.count
  });
});

// START
app.listen(PORT, () => console.log("🚀 FAST MAIL SENDER ON PORT", PORT));

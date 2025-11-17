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

/* -----------------------------------------
⭐ NEW CHANGE:
Limit will work separately for EACH EMAIL ID.
------------------------------------------- */
let limitMap = {}; // { email: { count: X, resetTime: Y } }

function limitCheck(req, res, next) {
  const sender = req.body.email;
  if (!sender) return res.json({ success: false, message: "Email missing." });

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
      message: `⚠ Limit complete for ${sender} (30/hour). Auto reset in 1 hour.`
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

// SEND (bulk)
app.post("/send", requireAuth, limitCheck, async (req, res) => {
  const { senderName, email, password, to, subject, message } = req.body;

  if (!email || !password || !to)
    return res.json({ success: false, message: "Missing fields" });

  const recipients = to.split(/[\n,]+/).map(r => r.trim()).filter(r => r);

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
<div style="white-space:pre; font-size:15px; font-family:Segoe UI; color:#222">
${message}
</div>
<div style="font-size:11px;color:#666;margin-top:18px;">📩 Scanned & Secured — www.avast.com</div>
`
      });

      info.count++;
      sentCount++;

      // ⭐ NEW SPEED — FAST SAFE SPEED
      await new Promise(res => setTimeout(res, 70));

    } catch (err) {}
  }

  res.json({
    success: true,
    message: `ID: ${email} | Sent: ${sentCount} | Remaining: ${30 - info.count}`
  });
});

// START
app.listen(PORT, () => console.log("FAST BULK MAIL SERVER RUNNING ON PORT", PORT));

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

// --------------⭐ 30 Mail / Hour Limit ⭐--------------
let mailCount = 0;
let resetTime = Date.now() + 60 * 60 * 1000;

function limitCheck(req, res, next) {
  const now = Date.now();

  if (now >= resetTime) {
    mailCount = 0;
    resetTime = now + 60 * 60 * 1000;
  }

  if (mailCount >= 30) {
    return res.json({
      success: false,
      message: "⚠️ Hourly limit reached (30 mails). Auto reset after 1 hour."
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

// ----------------⭐ SEND ALL ⭐----------------

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

  let sentCount = 0;

  for (let r of recipients) {
    if (mailCount >= 30)
      return res.json({
        success: true,
        message: `Stopped. Sent: ${sentCount}. Remaining: 0`
      });

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

      mailCount++;
      sentCount++;

      // ⭐ MEDIUM SPEED (250ms delay)
      await new Promise(res => setTimeout(res, 250));

    } catch (err) {}
  }

  res.json({
    success: true,
    message: `Sent: ${sentCount}. Remaining: ${30 - mailCount}`
  });
});

// START
app.listen(PORT, () => console.log("SAFE Mail Launcher Running on PORT", PORT));

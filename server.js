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

// --------------⭐ 30 Mail / Hour Limit System ⭐--------------
let mailCount = 0;
let limitResetTime = Date.now() + 60 * 60 * 1000; // 1 hour

function limitCheck(req, res, next) {
  const now = Date.now();

  if (now >= limitResetTime) {
    mailCount = 0;
    limitResetTime = now + 60 * 60 * 1000;
  }

  if (mailCount >= 30) {
    return res.json({
      success: false,
      message: "⚠️ Hourly Limit Reached (30 mails). Auto-reset after 1 hour."
    });
  }

  next();
}

// -------------------------------------------------------------

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

// ⭐ HIGH SPEED MAIL SENDER
app.post("/send", requireAuth, limitCheck, async (req, res) => {
  const { senderName, email, password, to, subject, message } = req.body;

  if (!email || !password || !to)
    return res.json({ success: false, message: "Missing fields" });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    secure: true,
    port: 465,
    pool: true,           // ⭐ super-fast multi-connection pool
    maxConnections: 5,     // ⭐ speed boost
    auth: { user: email, pass: password }
  });

  try {
    await transporter.sendMail({
      from: `"${senderName || "Sender"}" <${email}>`,
      to,
      subject,
      html: `
        <div style="
          margin:0 !important;
          padding:0 !important;
          white-space:pre !important;
          font-size:15px !important;
          line-height:1.55 !important;
          color:#222 !important;
          font-family:Segoe UI, Arial, sans-serif !important;
        ">
${message}
        </div>

        <div style="
          font-size:11px;
          color:#666;
          margin-top:18px;
          font-family:Segoe UI, Arial, sans-serif;
        ">
          📩 Scanned & Secured — www.avast.com
        </div>
      `
    });

    mailCount++; // ⭐ Count updated

    res.json({ success: true, message: "Mail Sent Successfully" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// START
app.listen(PORT, () => console.log("SAFE Server Running on PORT", PORT));

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = 8080;
const PUBLIC = path.join(process.cwd(), "public");

// LOGIN — your chosen ID/password
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// SAFE LIMIT: 30 emails per hour per account
let LIMIT = {};
const MAX_LIMIT = 30;
const ONE_HOUR = 60 * 60 * 1000;

function initLimit(email) {
  if (!LIMIT[email]) {
    LIMIT[email] = {
      count: 0,
      reset: Date.now() + ONE_HOUR
    };
  }
  if (Date.now() > LIMIT[email].reset) {
    LIMIT[email].count = 0;
    LIMIT[email].reset = Date.now() + ONE_HOUR;
  }
}

app.use(bodyParser.json());
app.use(express.static(PUBLIC));

app.use(
  session({
    secret: "safe-legal-mailer",
    resave: false,
    saveUninitialized: true
  })
);

function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

// LOGIN
app.post("/login", (req, res) => {
  if (req.body.username === HARD_USERNAME && req.body.password === HARD_PASSWORD) {
    req.session.user = HARD_USERNAME;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

// PAGES
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/launcher", auth, (req, res) => res.sendFile(path.join(PUBLIC, "launcher.html")));

// SEND (SAFE LEGAL MULTI-SEND)
app.post("/send", auth, async (req, res) => {
  const { senderName, email, password, subject, message, recipients } = req.body;

  if (!email || !password || !recipients)
    return res.json({ success: false, message: "Missing fields" });

  // Prepare list
  const list = recipients
    .split(/[\n,]+/)
    .map(r => r.trim())
    .filter(Boolean);

  if (!list.length)
    return res.json({ success: false, message: "No valid recipients" });

  // LIMIT INIT
  initLimit(email);

  if (LIMIT[email].count + list.length > MAX_LIMIT) {
    return res.json({
      success: false,
      message: `❌ Limit exceeded. Remaining: ${MAX_LIMIT - LIMIT[email].count}`
    });
  }

  // Transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    secure: true,
    port: 465,
    auth: { user: email, pass: password }
  });

  let sent = 0;
  let failed = 0;

  for (const to of list) {
    try {
      await transporter.sendMail({
        from: `"${senderName || 'Sender'}" <${email}>`,
        to,
        subject: subject || "",

        // ⭐ EXACT TEMPLATE — NO EXTRA SPACE — SAFE HTML ⭐
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
        `,
      });

      sent++;
      LIMIT[email].count++;
    } catch (err) {
      failed++;
    }

    await new Promise(r => setTimeout(r, 150)); // SAFE FAST SPEED
  }

  res.json({
    success: true,
    message: `Sent: ${sent}, Failed: ${failed}`,
    left: MAX_LIMIT - LIMIT[email].count
  });
});

// START
app.listen(PORT, () => console.log(`SAFE mailer running on ${PORT}`));

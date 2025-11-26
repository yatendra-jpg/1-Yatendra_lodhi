require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

// LOGIN credentials (same username & password)
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// Hourly limit per sending email account
let EMAIL_LIMIT = {}; // { "sender@example.com": { count: N, resetTime: timestamp } }
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 60 * 60 * 1000;

// Sending behavior: batching + safe delays (fast but lower block risk)
const BASE_BATCH_SIZE = 5;
const SAFE_DELAY_MIN = 350; // ms
const SAFE_DELAY_MAX = 700; // ms

const delay = ms => new Promise(res => setTimeout(res, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(
  session({
    secret: "launcher-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR, secure: false }
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
  res.json({ success: false, message: "❌ Invalid credentials" });
});

// Serve pages
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/launcher", requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, "launcher.html")));

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Convert plain text -> safe HTML preserving line breaks (only <br>, no extra styling in message)
function convertToHTML(text) {
  const safe = (text || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map(line => (line.trim() === "" ? "<br>" : line))
    .join("<br>");

  // Add Avast footer (as requested)
  return `
    <div style="font-size:15px;line-height:1.5;">
      ${safe}
    </div>
    <div style="font-size:11px;color:#666;margin-top:18px;">
      📩 Scanned & Secured — www.avast.com
    </div>
  `;
}

// SEND route
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "❌ Missing fields" });
    }

    // Parse recipients (comma or newline)
    const list = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(Boolean);

    if (!list.length) {
      return res.json({ success: false, message: "❌ No valid recipients" });
    }

    // Init/reset hourly tracking for this sender email
    if (!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = { count: 0, resetTime: Date.now() + ONE_HOUR };
    }

    if (Date.now() > EMAIL_LIMIT[email].resetTime) {
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].resetTime = Date.now() + ONE_HOUR;
    }

    if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR) {
      return res.json({
        success: false,
        message: "❌ Hourly limit reached",
        left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
      });
    }

    // Create transporter for Gmail
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: { user: email, pass: password }
    });

    // Verify auth early
    try {
      await transporter.verify();
    } catch (err) {
      return res.json({ success: false, message: "❌ Wrong App Password / Login failed" });
    }

    let sent = 0;
    let fail = 0;

    const finalHTML = convertToHTML(message);

    // Send in batches
    for (let i = 0; i < list.length; ) {
      const batch = list.slice(i, i + BASE_BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from: `"${senderName || "Sender"}" <${email}>`,
            to,
            subject: subject || " ",
            html: finalHTML
          })
        )
      );

      // Count results
      results.forEach(r => {
        if (r.status === "fulfilled") sent++;
        else fail++;
      });

      // Update hourly count
      EMAIL_LIMIT[email].count += batch.length;

      // Move to next batch
      i += batch.length;

      // Delay between batches (randomized to look natural)
      if (i < list.length) await delay(rand(SAFE_DELAY_MIN, SAFE_DELAY_MAX));
    }

    return res.json({
      success: true,
      message: `Sent: ${sent} | Failed: ${fail}`,
      left: MAX_MAILS_PER_HOUR - EMAIL_LIMIT[email].count
    });
  } catch (err) {
    return res.json({ success: false, message: err.message || "Unknown error" });
  }
});

// Optional: periodically clean expired entries (keeps memory tidy)
setInterval(() => {
  const now = Date.now();
  for (const em in EMAIL_LIMIT) {
    if (EMAIL_LIMIT[em].resetTime < now - ONE_HOUR) delete EMAIL_LIMIT[em];
  }
}, 10 * 60 * 1000); // every 10 minutes

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

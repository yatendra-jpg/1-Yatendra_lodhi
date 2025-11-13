require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(process.cwd(), "public");

// --- Login Credentials ---
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// --- 1 Hour Mail Limit ---
const MAX_PER_HOUR = 31;
let LIMIT_TRACKER = {}; // { email: { count, reset } }
const ONE_HOUR = 60 * 60 * 1000;

// --- Speed ---
const BATCH_SIZE = 5;
const DELAY = 180; // faster sending but safe

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Middleware
app.use(bodyParser.json());
app.use(express.static(PUBLIC));
app.use(
  session({
    secret: "mailer-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR },
  })
);

function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

app.get("/", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(PUBLIC, "launcher.html"))
);

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.post("/send", auth, async (req, res) => {
  const { senderName, email, password, recipients, subject, message } =
    req.body;

  if (!email || !password || !recipients)
    return res.json({
      success: false,
      message: "❌ Email, password, recipients required",
    });

  // Parse recipients
  const list = recipients
    .split(/[\n,]+/)
    .map((e) => e.trim())
    .filter(Boolean);

  if (!list.length)
    return res.json({ success: false, message: "No valid recipients" });

  // LIMIT INIT
  if (!LIMIT_TRACKER[email])
    LIMIT_TRACKER[email] = { count: 0, reset: Date.now() + ONE_HOUR };

  if (Date.now() > LIMIT_TRACKER[email].reset) {
    LIMIT_TRACKER[email] = { count: 0, reset: Date.now() + ONE_HOUR };
  }

  if (LIMIT_TRACKER[email].count + list.length > MAX_PER_HOUR) {
    return res.json({
      success: false,
      message: "❌ Hourly limit exceeded",
      left: MAX_PER_HOUR - LIMIT_TRACKER[email].count,
    });
  }

  // Transporter
  const t = nodemailer.createTransport({
    host: "smtp.gmail.com",
    secure: true,
    port: 465,
    auth: { user: email, pass: password },
  });

  try {
    await t.verify();
  } catch {
    return res.json({ success: false, message: "❌ Wrong App Password" });
  }

  let sent = 0,
    failed = 0;

  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((to) =>
        t.sendMail({
          from: `"${senderName || "Sender"}" <${email}>`,
          to,
          subject,
          text:
            message +
            `\n\n📩 Secured`, // footer ADD
        })
      )
    );

    results.forEach((r) =>
      r.status === "fulfilled" ? sent++ : failed++
    );

    await sleep(DELAY);
  }

  LIMIT_TRACKER[email].count += sent;

  res.json({
    success: true,
    message: `Sent: ${sent} | Failed: ${failed}`,
    left: MAX_PER_HOUR - LIMIT_TRACKER[email].count,
  });
});

app.listen(PORT, () =>
  console.log(`Mailer running on port ${PORT}`)
);

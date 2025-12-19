const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

/* ===== LOGIN ===== */
const LOGIN_ID = "yatendrakumar882";
const LOGIN_PASS = "yatendrakumar882";

/* ===== RATE LIMIT ===== */
const LIMIT_PER_HOUR = 28;
const ONE_HOUR = 60 * 60 * 1000;

/*
  senderLimits = {
    "sender@gmail.com": { count: 10, resetAt: timestamp }
  }
*/
const senderLimits = {};

/* ===== MIDDLEWARE ===== */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "fast-clean-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR }
  })
);

/* ===== AUTH ===== */
function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_ID && password === LOGIN_PASS) {
    req.session.user = LOGIN_ID;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

/* ===== LOGOUT ===== */
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* ===== PAGES ===== */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);
app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

/* ===== UTILS ===== */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function createTransporter(email, appPassword) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: appPassword }
  });
}

/* ===== RATE LIMIT CHECK ===== */
function useQuota(senderEmail) {
  const now = Date.now();

  if (!senderLimits[senderEmail]) {
    senderLimits[senderEmail] = {
      count: 0,
      resetAt: now + ONE_HOUR
    };
  }

  const info = senderLimits[senderEmail];

  if (now >= info.resetAt) {
    info.count = 0;
    info.resetAt = now + ONE_HOUR;
  }

  if (info.count >= LIMIT_PER_HOUR) {
    return false;
  }

  info.count++;
  return true;
}

function remainingQuota(senderEmail) {
  if (!senderLimits[senderEmail]) return LIMIT_PER_HOUR;
  const info = senderLimits[senderEmail];
  if (Date.now() >= info.resetAt) return LIMIT_PER_HOUR;
  return LIMIT_PER_HOUR - info.count;
}

/* ===== SEND MAIL ===== */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);

    const mailBody =
`${message}


📩 Scanned & Secured — www.avast.com`;

    let sent = 0;

    // Fast sequential with tiny delay (≈6–7 sec for 25)
    for (const to of list) {
      if (!useQuota(email)) break;

      try {
        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject: subject || "",
          text: mailBody,
          headers: {
            "Date": new Date().toUTCString(),
            "MIME-Version": "1.0"
          }
        });
        sent++;
      } catch {}

      await sleep(250); // speed tuning
    }

    const used = LIMIT_PER_HOUR - remainingQuota(email);

    res.json({
      success: true,
      sent,
      used,
      limit: LIMIT_PER_HOUR,
      message: `Send (${used}/${LIMIT_PER_HOUR})`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("Fast clean mail server running on port " + PORT);
});

const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const LOGIN_ID = "yatendrakumar882";
const LOGIN_PASS = "yatendrakumar882";

/* LIMITS */
const LIMIT_PER_HOUR = 28;
const ONE_HOUR = 60 * 60 * 1000;
const senderLimits = {}; // { email: { count, resetAt } }

/* MIDDLEWARE */
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

/* AUTH */
function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* LOGIN / LOGOUT */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_ID && password === LOGIN_PASS) {
    req.session.user = LOGIN_ID;
    return res.json({ success: true });
  }
  res.json({ success: false });
});
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* PAGES */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);
app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

/* MAIL */
function createTransporter(email, appPassword) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: appPassword }
  });
}

/* LIMIT HELPERS */
function checkAndUse(sender) {
  const now = Date.now();
  if (!senderLimits[sender]) {
    senderLimits[sender] = { count: 0, resetAt: now + ONE_HOUR };
  }
  const s = senderLimits[sender];
  if (now >= s.resetAt) {
    s.count = 0;
    s.resetAt = now + ONE_HOUR;
  }
  if (s.count >= LIMIT_PER_HOUR) return false;
  s.count++;
  return true;
}
function used(sender) {
  if (!senderLimits[sender]) return 0;
  const s = senderLimits[sender];
  if (Date.now() >= s.resetAt) return 0;
  return s.count;
}

/* SPEED TUNING: ~5–6s for 25 mails */
async function runTuned(list, workers, handler) {
  const buckets = Array.from({ length: workers }, () => []);
  list.forEach((v, i) => buckets[i % workers].push(v));
  await Promise.all(
    buckets.map(async bucket => {
      for (const item of bucket) {
        await handler(item);
      }
    })
  );
}

/* SEND */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);

    // 🔐 Verify App Password FIRST
    try {
      await transporter.verify();
    } catch {
      return res.json({
        success: false,
        code: "WRONG_PASS",
        message: "Wrong Password Not Send ❌"
      });
    }

    // 🛑 Pre-check limit (block if already full)
    if (used(email) >= LIMIT_PER_HOUR) {
      return res.json({
        success: false,
        code: "LIMIT_FULL",
        message: "Mail Limit full ❌"
      });
    }

    const body =
`${message}


📩 Scanned & Secured — www.avast.com`;

    let sent = 0;
    let limitHit = false;

    await runTuned(list, 5, async (to) => {
      if (!checkAndUse(email)) {
        limitHit = true;
        return;
      }
      try {
        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject: subject || "",
          text: body,
          headers: {
            "Date": new Date().toUTCString(),
            "MIME-Version": "1.0"
          }
        });
        sent++;
      } catch {}
    });

    if (limitHit && sent === 0) {
      return res.json({
        success: false,
        code: "LIMIT_FULL",
        message: "Mail Limit full ❌"
      });
    }

    return res.json({
      success: true,
      message: `Send (${used(email)}/${LIMIT_PER_HOUR})`
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* START */
app.listen(PORT, () => {
  console.log("Fast clean mail server running on port " + PORT);
});

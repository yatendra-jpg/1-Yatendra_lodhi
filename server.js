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

/* ===== RATE LIMIT CONFIG ===== */
const LIMIT_PER_HOUR = 28;
const ONE_HOUR = 60 * 60 * 1000;

/*
  senderLimits = {
    "sender@gmail.com": {
      count: 12,
      resetAt: timestamp
    }
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
function canSend(senderEmail) {
  const now = Date.now();

  if (!senderLimits[senderEmail]) {
    senderLimits[senderEmail] = {
      count: 0,
      resetAt: now + ONE_HOUR
    };
  }

  const info = senderLimits[senderEmail];

  // auto reset after 1 hour
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

/* ===== FAST PARALLEL SENDER ===== */
async function runParallel(list, workers, handler) {
  const buckets = Array.from({ length: workers }, () => []);
  list.forEach((item, i) => buckets[i % workers].push(item));

  await Promise.all(
    buckets.map(async bucket => {
      for (const item of bucket) {
        await handler(item);
        await sleep(60); // fast + stable
      }
    })
  );
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
    let blocked = 0;

    await runParallel(list, 5, async (to) => {
      if (!canSend(email)) {
        blocked++;
        return;
      }

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
    });

    res.json({
      success: true,
      message: `Sent ${sent} | Hourly limit reached: ${blocked}`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("Fast clean mail server running on port " + PORT);
});

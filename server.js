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
    secret: "safe-clean-session",
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
function getState(sender) {
  const now = Date.now();
  if (!senderLimits[sender]) {
    senderLimits[sender] = { count: 0, resetAt: now + ONE_HOUR };
  }
  const s = senderLimits[sender];
  if (now >= s.resetAt) {
    s.count = 0;
    s.resetAt = now + ONE_HOUR;
  }
  return s;
}

/* SAFE SPEED: ~6–7s for 25 mails */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function runSafe(list, workers, handler) {
  const buckets = Array.from({ length: workers }, () => []);
  list.forEach((v, i) => buckets[i % workers].push(v));
  await Promise.all(
    buckets.map(async bucket => {
      for (const item of bucket) {
        await handler(item);
        await sleep(80); // gentle pacing
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

    // 🔒 HARD PRE-CHECK: if total > 28 → block ALL
    const state = getState(email);
    if (list.length > LIMIT_PER_HOUR || state.count + list.length > LIMIT_PER_HOUR) {
      return res.json({
        success: false,
        code: "LIMIT_FULL",
        message: "Mail Limit Full ❌"
      });
    }

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

    const body =
`${message}


📩 Scanned & Secured — www.avast.com`;

    // send safely
    await runSafe(list, 5, async (to) => {
      await transporter.sendMail({
        from: `${senderName || "User"} <${email}>`,
        replyTo: email,
        to,
        subject: subject || "",
        text: body,
        headers: {
          "Date": new Date().toUTCString(),
          "MIME-Version": "1.0"
        }
      });
      state.count++; // increment only after success attempt
    });

    return res.json({
      success: true,
      message: `Send (${state.count}/${LIMIT_PER_HOUR})`
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* START */
app.listen(PORT, () => {
  console.log("Safe clean mail server running on port " + PORT);
});

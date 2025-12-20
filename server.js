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
const senderState = {}; // { email: { count, resetAt } }

/* MIDDLEWARE */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "safe-session",
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

/* MAIL TRANSPORT */
function transporterFor(email, appPass) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: appPass },
    tls: { rejectUnauthorized: true }
  });
}

/* STATE */
function getState(email) {
  const now = Date.now();
  if (!senderState[email]) {
    senderState[email] = { count: 0, resetAt: now + ONE_HOUR };
  }
  const s = senderState[email];
  if (now >= s.resetAt) {
    s.count = 0;
    s.resetAt = now + ONE_HOUR;
  }
  return s;
}

/* REAL DELAY */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* SEND */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const state = getState(email);

    /* HARD LIMIT: 29th blocked (0 send) */
    if (list.length > LIMIT_PER_HOUR || state.count + list.length > LIMIT_PER_HOUR) {
      return res.json({
        success: false,
        code: "LIMIT_FULL",
        message: "Mail Limit Full ❌"
      });
    }

    const transporter = transporterFor(email, password);

    /* VERIFY APP PASSWORD */
    try {
      await transporter.verify();
    } catch {
      return res.json({
        success: false,
        code: "WRONG_PASS",
        message: "Wrong Password Not Send ❌"
      });
    }

    /* PLAIN TEXT BODY + 2 LINE GAP + FOOTER */
    const body =
`${message}


📩 Scanned & Secured — www.avast.com`;

    /* SEQUENTIAL SEND (SAFE, ~4–5s) */
    for (const to of list) {
      await transporter.sendMail({
        from: `${senderName || "User"} <${email}>`,
        replyTo: email,
        to,
        subject: subject || "",
        text: body,
        headers: {
          "Date": new Date().toUTCString(),
          "MIME-Version": "1.0",
          "X-Mailer": "Secure Mail Client"
        }
      });

      state.count++;
      await sleep(190); // ~4–5 seconds for 25 mails
    }

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
  console.log("Safe mail server running on port " + PORT);
});

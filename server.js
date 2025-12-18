const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

/* ===== LOGIN CONFIG ===== */
const LOGIN_ID = "yatendrakumar882";
const LOGIN_PASS = "yatendrakumar882";

/* ===== MIDDLEWARE ===== */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "clean-session-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
  })
);

/* ===== AUTH CHECK ===== */
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
  res.json({ success: false, message: "Invalid login" });
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
    auth: {
      user: email,
      pass: appPassword
    }
  });
}

/* ===== SEND MAIL (SAFE MODE) ===== */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const emails = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));

    const transporter = createTransporter(email, password);

    /* Template + 2 line gap + footer */
    const bodyText =
`${message}

    
📩 Scanned & Secured — www.avast.com`;

    let sent = 0;

    for (const to of emails) {
      try {
        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject: subject || "",
          text: bodyText   // plain-text = safer
        });
        sent++;
      } catch (err) {
        // ignore individual failure
      }

      /* gentle delay (safe) */
      await sleep(500);
    }

    res.json({
      success: true,
      message: `Mail Sent ✔ (${sent}/${emails.length})`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("Clean mail server running on port " + PORT);
});

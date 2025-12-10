require('dotenv').config();
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const HARD_USER = "secure-user@#882";
const HARD_PASS = "secure-user@#882";

/* PRE-LOADED connection pool for fast sending (safe method) */
const transporterCache = {};

async function getTransporter(email, password) {
  if (transporterCache[email]) return transporterCache[email];

  const trans = nodemailer.createTransport({
    service: "gmail",
    pool: true,                 // ENABLES SUPER FAST PIPELINING
    maxConnections: 5,          // parallel 5 requests at once
    maxMessages: 100,           // very safe
    auth: { user: email, pass: password }
  });

  await trans.verify();
  transporterCache[email] = trans;
  return trans;
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "fastSessionSecure98",
    resave: false,
    saveUninitialized: true
  })
);

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USER && password === HARD_PASS) {
    req.session.user = username;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "Invalid Login" });
});

function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, subject, message, recipients } = req.body;

    const recList = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    let transporter;
    try {
      transporter = await getTransporter(email, password);
    } catch {
      return res.json({ success: false, message: "Wrong Password ❌" });
    }

    let delivered = 0;

    // send SUPER FAST using parallel queue system
    await Promise.all(
      recList.map(async (r) => {
        try {
          await transporter.sendMail({
            from: `${senderName} <${email}>`,
            to: r,
            subject: subject,
            html: `
              <p>${message.replace(/\n/g,"<br>")}</p>
              <p style="font-size:11px;color:#777;">System processed communication ✉</p>
            `
          });
          delivered++;
        } catch {}
      })
    );

    return res.json({
      success: true,
      message: `Mail Sent Successfully ✔ (${delivered})`
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT);

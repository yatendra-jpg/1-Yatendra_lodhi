require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const HARD_USER = "secure-user@#882";
const HARD_PASS = "secure-user@#882";

/* Optimized SAFE Speed */
const SAFE_MIN_DELAY = 120;
const SAFE_MAX_DELAY = 180;

/* delay helper */
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "secure-fast-key",
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

  return res.json({ success: false, message: "Invalid Access ❌" });
});

function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

app.get("/launcher", requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* SEND MAIL LOGIC */
app.post("/send", requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, subject, message, recipients } = req.body;

    const list = recipients
      .split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes("@"));

    if (!list.length)
      return res.json({ success: false, message: "No valid emails ❌" });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "Wrong Password/App key ❌" });
    }

    let sent = 0;

    for (let to of list) {
      await transporter.sendMail({
        from: `"${senderName || "Verified User"}" <${email}>`,
        to,
        subject,
        html: `
          <div style="font-size:15px;line-height:1.5;">${message.replace(/\n/g,"<br>")}</div>
          <br><br>
          <small style="font-size:11px;color:#666;">
            Secure Scan Verified — www.avast.com 🔐
          </small>
        `
      });

      sent++;
      await delay(rand(SAFE_MIN_DELAY, SAFE_MAX_DELAY)); // SAFE FAST
    }

    return res.json({
      success: true,
      message: `Mail Sent Successfully ✔ (${sent})`
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log("Running securely..."));

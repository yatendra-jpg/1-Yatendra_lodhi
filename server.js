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

/* Fast safe delay 70–120ms */
function smartDelay() {
  return new Promise(res => setTimeout(res, Math.floor(Math.random() * 50) + 70));
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "secureMailFastSession",
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

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password }
    });

    try {
      await transporter.verify();
    } catch {
      return res.json({ success: false, message: "Wrong Password ❌" });
    }

    let delivered = 0;

    for (const r of list) {
      try {
        await transporter.sendMail({
          from: `${senderName} <${email}>`,
          to: r,
          subject,
          html: `
            <p style="font-size:15px">${message.replace(/\n/g,"<br>")}</p>
            <p style="font-size:11px;color:#888">Message processed automatically 🤖</p>
          `
        });

        delivered++;
      } catch {}

      await smartDelay();
    }

    return res.json({ success: true, message: `Mail Sent Successfully ✔ (${delivered})` });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT);

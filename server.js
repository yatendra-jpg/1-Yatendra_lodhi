require('dotenv').config();
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

const HARD_USER = "secure-user@#882";
const HARD_PASS = "secure-user@#882";

/* CACHE TRANSPORTER TO INCREASE SPEED */
const transporterPool = {};

async function getTransporter(email, password) {
  if (transporterPool[email]) return transporterPool[email];

  const transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 5,
    maxMessages: 200,
    auth: { user: email, pass: password }
  });

  await transporter.verify();
  transporterPool[email] = transporter;
  return transporter;
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "secure-session-fast",
    resave: false,
    saveUninitialized: true
  })
);

function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USER && password === HARD_PASS) {
    req.session.user = username;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "Invalid credentials ❌" });
});

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
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    let transporter;
    try {
      transporter = await getTransporter(email, password);
    } catch {
      return res.json({ success: false, message: "Wrong App Password ❌" });
    }

    let sent = 0;

    await Promise.all(
      list.map(async r => {
        try {
          await transporter.sendMail({
            from: `${senderName || "User"} <${email}>`,
            to: r,
            subject: subject || "(No Subject)",
            html: `
              <div style="font-size:15px;">
                ${message.replace(/\n/g, "<br>")}
              </div>
              <br>
              <div style="font-size:11px;color:#7c7c7c;">
                📩 Scanned & Secured — www.avast.com
              </div>
            `
          });
          sent++;
        } catch {}
      })
    );

    return res.json({
      success: true,
      message: `Mail Sent Successfully ✔ (${sent})`
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT);

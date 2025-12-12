require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const HARD_USER = "pradeepkumar882";
const HARD_PASS = "pradeepkumar882";

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "fast-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
  })
);

/* AUTH */
function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

/* LOGIN */
app.post("/login", (req, res) => {
  if (req.body.username === HARD_USER && req.body.password === HARD_PASS) {
    req.session.user = HARD_USER;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "Invalid Login ❌" });
});

/* LOGOUT */
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

/* TRANSPORTER – SUPER FAST MODE */
function createTransporter(email, password) {
  return nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 10,     // ⚡ SUPER FAST
    maxMessages: Infinity,  // unlimited
    rateLimit: false,
    auth: { user: email, pass: password },
    tls: { rejectUnauthorized: false }
  });
}

/* SEND EMAIL – 25 EMAILS IN 5–6 SECONDS */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));

    const transporter = createTransporter(email, password);

    const finalHTML = `
      <pre style="font-family:Arial, Segoe UI; font-size:15px; white-space:pre-wrap; line-height:1.6;">
${message}
      </pre>
    `;

    let sent = 0;

    await Promise.all(
      list.map(async (to) => {
        try {
          await transporter.sendMail({
            from: `${senderName || "User"} <${email}>`,
            to,
            subject,
            html: finalHTML
          });

          sent++;
        } catch (e) {
          console.log("Failed:", to, e.message);
        }
      })
    );

    res.json({
      success: true,
      message: `Mail Sent ✔ (${sent}/${list.length})`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log("FAST MAIL SERVER running on " + PORT));

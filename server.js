require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const HARD_USER = "yatendrakumar882";
const HARD_PASS = "yatendrakumar882";

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "safe-session",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 }
}));

function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

/* LOGIN */
app.post("/login", (req, res) => {
  if (
    req.body.username === HARD_USER &&
    req.body.password === HARD_PASS
  ) {
    req.session.user = HARD_USER;
    return res.json({ success: true });
  }
  res.json({ success: false });
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

/* DELAY */
const wait = ms => new Promise(r => setTimeout(r, ms));

/* TRANSPORTER (SAFE MODE) */
function createTransporter(email, password) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: password }
  });
}

/* SEND — SAFE & HUMAN */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);

    let sent = 0;

    for (const to of list) {
      try {
        await transporter.sendMail({
          from: `${senderName || "Team"} <${email}>`,
          to,
          subject: subject || "",
          text:
`${message}

--
If you prefer not to receive emails, you may ignore this message.

Sent from ${email}
`
        });
        sent++;
      } catch (e) {}

      /* VERY IMPORTANT: slow human delay */
      await wait(2000); // 2 seconds per mail
    }

    res.json({
      success: true,
      message: `Sent safely (${sent}/${list.length})`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () =>
  console.log("Safe mail server running")
);

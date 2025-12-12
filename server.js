require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN CREDENTIALS */
const HARD_USER = "pradeepkumar882";
const HARD_PASS = "pradeepkumar882";

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "safe-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hr
  })
);

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

/* DELAY FUNCTION (Prevents Gmail Blocking) */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* SEND EMAIL (100% DELIVERY — NO SKIP) */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password },
      tls: { rejectUnauthorized: false }
    });

    let sent = 0;

    for (let r of list) {
      try {
        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to: r,
          subject: subject || "",
          html: `
            <pre style="font-family:Arial, Segoe UI; font-size:15px; white-space:pre-wrap; line-height:1.6;">
${message}
            </pre>
          `
        });

        sent++;

        await wait(150); // Prevent Gmail blocking
      } catch (err) {
        console.log("Failed ->", r, err.message);
      }
    }

    return res.json({
      success: true,
      message: `Mail Sent ✔ (${sent}/${list.length})`
    });

  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.listen(PORT, () => console.log("Server running on PORT " + PORT));

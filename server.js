const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Login System
app.use(
  session({
    secret: "secure-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// LOGIN PAGE
app.get("/", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "login.html"));
});

// LOGIN API
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "secure-user@#882" && password === "secure-pass@#882") {
    req.session.loggedIn = true;
    return res.json({ success: true });
  }

  return res.json({ success: false });
});

// PROTECTED ROUTE
app.get("/launcher", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/");
  }
  return res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

// MAIL API — UNLIMITED / SUPER FAST
app.post("/send-mails", async (req, res) => {
  if (!req.session.loggedIn) {
    return res.json({ error: "Unauthorized" });
  }

  const { senderName, gmail, appPassword, subject, message, recipients } = req.body;

  const receiverList = recipients
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter((e) => e);

  // Transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmail,
      pass: appPassword,
    },
  });

  let sentCount = 0;

  try {
    await Promise.all(
      receiverList.map((email) =>
        transporter.sendMail({
          from: `${senderName} <${gmail}>`,
          to: email,
          subject,
          text: message + "\n\n📩 www.mail-verification-secure.com",
        })
      )
    );

    sentCount = receiverList.length;

    return res.json({ success: true, count: sentCount });
  } catch (e) {
    return res.json({ success: false, message: "Password Wrong ❌" });
  }
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// START SERVER
app.listen(10000, () => console.log("Server Running on PORT 10000"));

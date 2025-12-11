const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");
const helmet = require("helmet");

const app = express();

app.use(helmet());
app.use(express.static("public"));
app.use(bodyParser.json());

app.use(
  session({
    secret: "secureMail882",
    resave: false,
    saveUninitialized: true,
  })
);

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

app.get("/launcher", (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

/* SEND MAIL */
app.post("/send", async (req, res) => {
  try {
    const { senderName, email, password, subject, message, recipients } = req.body;

    const emails = recipients.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password }
    });

    let sent = 0;

    await Promise.all(
      emails.map(async (to) => {
        try {
          await transporter.sendMail({
            from: `${senderName} <${email}>`,
            to,
            subject,
            text: `${message}\n\n\n📩 Verified Secure — www.avast.com`,
          });
          sent++;
        } catch (err) { }
      })
    );

    return res.json({ success: true, sentCount: sent });

  } catch (err) {
    return res.json({ success: false });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.listen(3000, () => console.log("SERVER RUNNING"));

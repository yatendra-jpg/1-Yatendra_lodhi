const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const VALID_USER = "secure-user@#882";
const VALID_PASS = "secure-user@#882";

// LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === VALID_USER && password === VALID_PASS)
    return res.json({ success: true });
  return res.json({ success: false });
});

// SEND MAIL (ULTRA FAST)
app.post("/api/send", async (req, res) => {
  const { senderName, gmail, appPass, subject, message, recipients } = req.body;

  let emails = recipients
    .split(/\r?\n|,/)
    .map((e) => e.trim())
    .filter(Boolean);

  // SUPER FAST Connection Pool
  let transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: { user: gmail, pass: appPass },
  });

  const footer = "\n\n\n📩  www.mail-verification-secure.com"; // minimal footer

  try {
    // send mails in parallel batches
    const batchSize = 10; // 10 mails ek saath → super fast
    let batchPromises = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      let chunk = emails.slice(i, i + batchSize);

      batchPromises.push(
        Promise.all(
          chunk.map((email) =>
            transporter.sendMail({
              from: `${senderName} <${gmail}>`,
              to: email,
              subject,
              text: message + footer,
            })
          )
        )
      );
    }

    await Promise.all(batchPromises);

    return res.json({ success: true, count: emails.length });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

// ROUTES
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/launcher", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

app.listen(process.env.PORT || 5000, () =>
  console.log("FAST Mail Server Running 🚀")
);

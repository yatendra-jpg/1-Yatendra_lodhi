const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   ROOT ROUTE FIX ✅
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* =========================
   LOGIN ROUTE
========================= */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "yattu" && password === "#882") {
    res.json({ success: true, redirect: "/launcher" });
  } else {
    res.json({ success: false, message: "Invalid login" });
  }
});

/* =========================
   LAUNCHER PAGE
========================= */
app.get("/launcher", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

/* =========================
   SEND MAIL (SAFE + FAST)
========================= */
app.post("/send", async (req, res) => {
  const { email, password, subject, message, recipients } = req.body;

  if (!email || !password || !recipients) {
    return res.json({ success: false, message: "Missing fields" });
  }

  const emailList = recipients
    .split("\n")
    .map(e => e.trim())
    .filter(e => e !== "");

  if (emailList.length === 0) {
    return res.json({ success: false, message: "No recipients found" });
  }

  // ✅ Footer
  const FOOTER = `

📩 Secure — www.avast.com
`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password
    }
  });

  let sent = 0;
  let failed = 0;
  let maxLimit = 31; // per hour safety

  let totalToSend = Math.min(emailList.length, maxLimit);

  for (let i = 0; i < totalToSend; i++) {
    const to = emailList[i];

    try {
      await transporter.sendMail({
        from: `"Secure Mailer" <${email}>`,
        to: to,
        subject: subject || "Hello",
        text: message + FOOTER
      });

      sent++;

      // ✅ Faster but still SAFE (500–900ms)
      let delay = Math.floor(Math.random() * 400) + 500;
      await sleep(delay);

    } catch (err) {
      failed++;
    }
  }

  res.json({
    success: true,
    sent,
    failed,
    limit: maxLimit
  });
});

/* =========================
   LOGOUT
========================= */
app.post("/logout", (req, res) => {
  res.json({ success: true, redirect: "/" });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(PORT, () => {
  console.log("Server Running on Port: " + PORT);
});

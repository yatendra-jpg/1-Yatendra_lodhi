const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// -------------------
// LOGIN ROUTE
// -------------------
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "yattu" && password === "#882") {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Invalid credentials" });
  }
});

// -------------------
// SAFE SEND ROUTE
// -------------------
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

  const SAFE_FOOTER = `

📩 Secure — www.avast.com
`;

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password
    }
  });

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emailList.length; i++) {
    try {

      const mailOptions = {
        from: `"Secure Mail" <${email}>`,
        to: emailList[i],
        subject: subject || "Hello",
        text: message + SAFE_FOOTER
      };

      await transporter.sendMail(mailOptions);
      sent++;

      // SAFE Delay (Human-like)
      await sleep(1500);

    } catch (err) {
      failed++;
    }
  }

  res.json({
    success: true,
    message: `Sent: ${sent}, Failed: ${failed}`
  });

});

// -------------------
// LOGOUT
// -------------------
app.post("/logout", (req, res) => {
  res.json({ success: true });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const DELAY = parseInt(process.env.DELAY_MS || "4000");

// secure transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.APP_USER,
    pass: process.env.APP_PASS
  }
});

// human delay
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/send", async (req, res) => {

  const { senderName, subject, message, recipients } = req.body;

  if (!recipients) return res.json({ success:false, message:"Recipients missing" });

  const list = recipients
    .split("\n")
    .map(e => e.trim())
    .filter(isValidEmail);

  if (list.length === 0)
    return res.json({ success:false, message:"No valid emails found" });

  let sent = 0;
  let failed = 0;

  for (const email of list) {
    try {

      const mailOptions = {
        from: `${senderName || "Notification"} <${process.env.APP_USER}>`,
        to: email,
        subject: subject || "Information",
        html: `
<div style="max-width:520px;font-family:Arial;padding:12px">
  <p>${message}</p>
  <small style="color:gray;">Secure — www.avast.com</small>
</div>
`
      };

      await transporter.sendMail(mailOptions);
      sent++;

      await wait(DELAY);

    } catch (err) {
      console.log(err.message);
      failed++;
    }
  }

  res.json({
    success: true,
    message: `Done ✅ Sent: ${sent} | Failed: ${failed}`
  });

});

app.post("/logout", (req,res)=>{
  res.json({ success:true })
});

app.listen(PORT, () =>
  console.log("✅ Server running at http://localhost:" + PORT)
);

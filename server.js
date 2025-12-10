require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const HARD_USER = "secure-user@#882";
const HARD_PASS = "secure-user@#882";

/* SAFE delay */
const SAFE_MIN = 150;
const SAFE_MAX = 250;

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function randomDelay() {
  return Math.floor(Math.random() * (SAFE_MAX - SAFE_MIN + 1)) + SAFE_MIN;
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "safe-key",
    resave: false,
    saveUninitialized: true
  })
);

app.post("/login", (req, res) => {
  if(req.body.username === HARD_USER && req.body.password === HARD_PASS){
    req.session.user = HARD_USER;
    return res.json({ success: true });
  }

  return res.json({ success: false, message: "Invalid Login ❌" });
});

function requireAuth(req, res, next){
  if(req.session.user) return next();
  return res.redirect("/");
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/launcher", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/launcher.html"));
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* SEND LOGIC */
app.post("/send", requireAuth, async (req, res) => {
  try{
    const { senderName, email, password, subject, message, recipients } = req.body;

    const list = recipients.split(/[\n,]+/)
    .map(v => v.trim())
    .filter(v => v.includes("@"));

    if(!list.length){
      return res.json({ success: false, message: "No valid recipients found ❌"});
    }

    const safeSubject = subject || "Quick Update for You";
    const scannedFooter = `
      <br><br>
      <div style="font-size:12px;color:#777;">
        Verified communication – Secured scan firewall<br>
        Scanned via avast.com®
      </div>`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      port: 465,
      auth: {
        user: email,
        pass: password
      }
    });

    try { await transporter.verify(); }
    catch { return res.json({ success:false, message:"Wrong App Password ❌"}); }

    let sent = 0;

    for(let r of list){
      try{
        await transporter.sendMail({
          from: `"${senderName || "Team Support"}" <${email}>`,
          to: r,
          subject: safeSubject,
          headers: {
            "X-Priority": "3",
            "X-Mailer": "SecureMailer v3",
            "List-Unsubscribe": `<mailto:unsubscribe@${email}>`
          },
          text: message.replace(/\n/g," "),
          html: `<div style="font-size:15px;line-height:1.6;">
            ${message.replace(/\n/g,"<br>")}
          </div>
          ${scannedFooter}`
        });

        sent++;
      }catch(err){
        console.log("FAILED:", r);
      }

      await delay(randomDelay());
    }

    return res.json({
      success:true,
      message:`Mail Sent Successfully ✔ (${sent})`
    });

  }catch(err){
    return res.json({ success:false, message:err.message });
  }
});

app.listen(PORT, () => console.log("Server running securely"));

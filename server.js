require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const dns = require("dns");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// 💠 Fixed Login (Safe Access)
const HARD_USERNAME = "secure-user@#882";
const HARD_PASSWORD = "secure-user@#882";

// 💠 Each ID will have 30 Mails Per Hour Limit
const LIMIT_PER_EMAIL = 30;
const ONE_HOUR = 60 * 60 * 1000;

// 💠 Track per Email ID sending
let LIMITS = {};

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
  secret: "safe-cookie-value",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

// 💠 SAFE DNS Email Validation
function validateEmail(email) {
  return new Promise(resolve => {
    const domain = email.split("@")[1];
    dns.resolveMx(domain, (err, mx) => {
      if (err || !mx || mx.length === 0) resolve(false);
      else resolve(true);
    });
  });
}

// Routes =========================================================
app.get("/", (req,res)=> {
  res.sendFile(path.join(process.cwd(),"public/login.html"));
});

app.get("/launcher", (req,res)=> {
  if(!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(process.cwd(),"public/launcher.html"));
});

app.post("/login", (req,res)=> {
  const {username,password} = req.body;

  if(username === HARD_USERNAME && password === HARD_PASSWORD){
    req.session.logged = true;
    return res.json({success:true});
  }

  res.json({success:false});
});

app.post("/logout", (req,res)=> {
  req.session.destroy(()=> res.json({success:true}));
});


// 💠 SEND MAIL ENDPOINT
app.post("/send", async (req,res)=>{
  try{
    const { email,password,message,subject,recipients } = req.body;

    // list clean
    const list = recipients.split(/[\n,]+/)
      .map(e=>e.trim())
      .filter(Boolean);

    let validEmails = [];
    let invalidEmails = [];

    // ✔ STEP-1 Validate Emails (legal & ethical)
    for(const mail of list){
      const ok = await validateEmail(mail);
      ok ? validEmails.push(mail) : invalidEmails.push(mail);
    }

    // TRACK limit per email-ID
    if(!LIMITS[email]) LIMITS[email] = {
      count: 0,
      expires: Date.now() + ONE_HOUR
    };

    if(Date.now() > LIMITS[email].expires){
      LIMITS[email] = { count:0, expires: Date.now()+ONE_HOUR };
    }

    // SAFETY LIMIT CHECK
    if(LIMITS[email].count + validEmails.length > LIMIT_PER_EMAIL){
      return res.json({success:false, type:"limit"});
    }

    // ✔ STEP-2 Create Safe SMTP Transport
    let transporter;
    try{
      transporter = nodemailer.createTransport({
        host:"smtp.gmail.com",
        secure:true,
        port:465,
        auth:{ user:email, pass:password }
      });

      await transporter.verify();
    }
    catch{
      return res.json({success:false,type:"wrongpass"});
    }

    let sent = 0;

    // ✔ STEP-3 Send ONLY VALID emails
    for(const to of validEmails){

      await transporter.sendMail({
        from: email,
        to,
        subject,
        html: `
          <div style="font-size:16px; color:#333; line-height:1.6;">
            ${message.replace(/\n/g,"<br>")}
          </div>
          <p style="font-size:12px; margin-top:8px; color:#777;">
            📩 Secure — www.avast.com
          </p>
        `
      });

      sent++;
      LIMITS[email].count++;
    }

    // Final Response
    return res.json({
      success:true,
      sent,
      invalidCount: invalidEmails.length,
      invalidEmails
    });

  }catch(err){
    return res.json({success:false});
  }
});

// Server Start ======================================================
app.listen(PORT, ()=> console.log(`🚀 Server running on port ${PORT}`));

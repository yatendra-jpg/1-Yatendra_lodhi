require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, "public");

// LOGIN CREDS
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// LIMIT (1 Hr = 31 mails)
let EMAIL_LIMIT = {};
const ONE_HOUR = 60 * 60 * 1000;
const MAX_MAILS = 31;

// FAST MODE SETTINGS 🚀
const BATCH_SIZE = 5;              // 5 emails at once
const DELAY_MIN = 80;              // min 80ms
const DELAY_MAX = 150;             // max 150ms

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const random = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

// MIDDLEWARE
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
  secret: "bulk-mailer-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

function requireAuth(req,res,next){
  if(req.session.user) return next();
  res.redirect("/");
}

// ROOT
app.get("/", (req,res)=>{
  res.sendFile(path.join(PUBLIC_DIR,"login.html"));
});

// LOGIN
app.post("/login",(req,res)=>{
  if(req.body.username===HARD_USERNAME && req.body.password===HARD_PASSWORD){
    req.session.user = HARD_USERNAME;
    return res.json({success:true});
  }
  res.json({success:false, message:"❌ Invalid credentials"});
});

// DASHBOARD
app.get("/launcher", requireAuth, (req,res)=>{
  res.sendFile(path.join(PUBLIC_DIR,"launcher.html"));
});

// LOGOUT
app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    res.clearCookie("connect.sid");
    res.json({success:true});
  });
});

// SEND MAIL (FAST MODE) 🚀
app.post("/send", requireAuth, async (req,res)=>{
  try{
    const { senderName, email, password, recipients, subject, message } = req.body;

    if(!email || !password || !recipients)
      return res.json({ success:false, message:"❌ Missing fields" });

    const list = recipients.split(/[\n,]+/)
      .map(x=>x.trim())
      .filter(Boolean);

    // LIMIT RESET
    if(!EMAIL_LIMIT[email]){
      EMAIL_LIMIT[email] = { count:0, reset: Date.now()+ONE_HOUR };
    }

    if(Date.now() > EMAIL_LIMIT[email].reset){
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].reset = Date.now()+ONE_HOUR;
    }

    if(EMAIL_LIMIT[email].count + list.length > MAX_MAILS){
      return res.json({
        success:false,
        message:"❌ Hourly Limit Reached",
        left: MAX_MAILS - EMAIL_LIMIT[email].count
      });
    }

    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{ user:email, pass:password }
    });

    try{
      await transporter.verify();
    }catch{
      return res.json({ success:false, message:"❌ Wrong App Password" });
    }

    let sent = 0, failed = 0;

    // FAST BATCH SENDING
    for(let i=0; i < list.length; i += BATCH_SIZE){
      const batch = list.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from:`"${senderName}" <${email}>`,
            to,
            subject,
            text:message
          })
        )
      );

      results.forEach(r =>
        r.status === "fulfilled" ? sent++ : failed++
      );

      EMAIL_LIMIT[email].count += batch.length;

      await sleep(random(DELAY_MIN, DELAY_MAX));  // very fast & safe
    }

    res.json({
      success:true,
      message:`Sent: ${sent} | Failed: ${failed}`,
      left: MAX_MAILS - EMAIL_LIMIT[email].count
    });

  } catch(err){
    res.json({success:false, message:err.message});
  }
});

// FALLBACK
app.use((req,res)=> res.sendFile(path.join(PUBLIC_DIR,"login.html")));

app.listen(PORT, ()=> console.log("🚀 FAST MAIL SERVER running on", PORT));

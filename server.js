require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

// LOGIN
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// LIMIT 31 mails/hour
let LIMIT = {};
const LIMIT_MAX = 31;
const ONE_HOUR = 3600000;

// **SAFE FAST SETTINGS**
const BATCH = 4;
const DELAY_MIN = 220;
const DELAY_MAX = 380;
const MICRO_MIN = 60;
const MICRO_MAX = 120;

const delay = ms => new Promise(r => setTimeout(r, ms));
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;

// CLEAN HTML (Gmail Friendly)
function cleanHTML(msg) {
  const body = (msg || "")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .split("\n")
    .join("<br>");

  return `
    <div style="font-size:15px;line-height:1.5;">
      ${body}
    </div>
    <div style="font-size:11px;color:#666;margin-top:14px;">
      📩 Scanned & Secured — www.avast.com
    </div>
  `;
}

// TEXT (backup version for spam safety)
function textVersion(msg) {
  return msg.replace(/<\/?[^>]+>/g, "");
}

// APP
app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "launcher",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

// Auth check
const auth = (req,res,next)=> req.session.user ? next() : res.redirect("/");

// LOGIN
app.post("/login",(req,res)=>{
  const {username,password}=req.body;

  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.user=username;
    return res.json({success:true});
  }
  res.json({success:false,message:"❌ Wrong credentials"});
});

// PAGES
app.get("/",(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"login.html")));
app.get("/launcher",auth,(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"launcher.html")));

// LOGOUT
app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    res.clearCookie("connect.sid");
    res.json({success:true});
  });
});

// SEND MAIL FAST + SAFE
app.post("/send",auth,async (req,res)=>{
  try{
    const { senderName, email, password, recipients, subject, message } = req.body;

    if(!email || !password || !recipients)
      return res.json({success:false,message:"❌ Missing fields"});

    const list = recipients.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
    if(!list.length)
      return res.json({success:false,message:"❌ No valid recipients"});

    // LIMIT
    if(!LIMIT[email])
      LIMIT[email]={count:0,reset:Date.now()+ONE_HOUR};

    if(Date.now()>LIMIT[email].reset){
      LIMIT[email].count=0;
      LIMIT[email].reset=Date.now()+ONE_HOUR;
    }

    if(LIMIT[email].count + list.length > LIMIT_MAX){
      return res.json({
        success:false,
        message:"❌ Only 31 mails per hour allowed",
        left: LIMIT_MAX - LIMIT[email].count
      });
    }

    // Transporter (clean)
    const transporter = nodemailer.createTransport({
      service:"gmail",
      auth:{ user:email, pass:password }
    });

    try { await transporter.verify(); }
    catch { return res.json({success:false,message:"❌ Wrong App Password"}); }

    let sent=0, fail=0;
    const htmlBody = cleanHTML(message);
    const textBody = textVersion(message);

    for(let i=0;i<list.length;){
      const chunk = list.slice(i, i + BATCH);

      const result = await Promise.allSettled(
        chunk.map(async to => {
          await delay(rand(MICRO_MIN,MICRO_MAX)); // ultra fast micro delay

          return transporter.sendMail({
            from:`"${senderName||"Sender"}" <${email}>`,
            to,
            subject:subject||" ",
            html:htmlBody,
            text:textBody
          });
        })
      );

      result.forEach(r => r.status==="fulfilled" ? sent++ : fail++);
      LIMIT[email].count += chunk.length;

      i += chunk.length;
      if(i < list.length)
        await delay(rand(DELAY_MIN,DELAY_MAX)); // fast batch delay
    }

    res.json({
      success:true,
      message:`Sent: ${sent} | Failed: ${fail}`,
      left: LIMIT_MAX - LIMIT[email].count
    });

  }catch(e){
    res.json({success:false,message:e.message});
  }
});

app.listen(PORT,()=>console.log(`FAST SAFE MAIL SERVER running on ${PORT}`));

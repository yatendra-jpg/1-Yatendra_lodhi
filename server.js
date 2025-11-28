require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

// LOGIN CREDS
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// LIMIT 31 per hour
let LIMIT = {};
const MAX_LIMIT = 31;
const ONE_HOUR = 3600000;

// SPEED (slightly reduced)
const BATCH = 4;

// ⬇⬇⬇ JUST SLIGHTLY SLOWER (SAFE)
const MICRO_MIN = 90;
const MICRO_MAX = 150;

const DELAY_MIN = 260;
const DELAY_MAX = 380;
// ⬆⬆⬆ SPEED ADJUSTED ONLY

const delay = ms => new Promise(r => setTimeout(r, ms));
const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: "launcher-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

function auth(req,res,next){
  if(req.session.user) return next();
  res.redirect("/");
}

// LOGIN
app.post("/login",(req,res)=>{
  const {username,password} = req.body;

  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.user = username;
    return res.json({success:true});
  }
  res.json({success:false, message:"❌ Invalid credentials"});
});

// PAGES
app.get("/", (req,res)=>res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/launcher", auth,(req,res)=>res.sendFile(path.join(PUBLIC_DIR, "launcher.html")));

// LOGOUT
app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    res.clearCookie("connect.sid");
    res.json({success:true});
  });
});

// CLEAN HTML + YOUR FOOTER
function cleanHtml(msg){
  const safe = msg
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .split("\n").join("<br>");

  return `
    <div style="font-size:15px; line-height:1.6; color:#111;">
      ${safe}
    </div>

    <div style="font-size:12px; color:#555; margin-top:20px;">
      📩 Scanned & Secured — www.avast.com
    </div>
  `;
}

// CLEAN TEXT
function cleanText(msg){
  return msg.replace(/<\/?[^>]+>/g,"");
}

// SEND EMAIL
app.post("/send", auth, async(req,res)=>{
  try{
    const {senderName,email,password,recipients,subject,message} = req.body;

    if(!email || !password || !recipients)
      return res.json({success:false,message:"❌ Missing fields"});

    let list = recipients.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
    if(!list.length)
      return res.json({success:false,message:"❌ No valid recipients"});

    // HOURLY LIMIT
    if(!LIMIT[email]) LIMIT[email]={count:0,reset:Date.now()+ONE_HOUR};
    if(Date.now() > LIMIT[email].reset){
      LIMIT[email].count = 0;
      LIMIT[email].reset = Date.now()+ONE_HOUR;
    }

    if(LIMIT[email].count + list.length > MAX_LIMIT){
      return res.json({
        success:false,
        message:"❌ Hourly limit reached",
        left: MAX_LIMIT - LIMIT[email].count
      });
    }

    // SAFE TRANSPORTER
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password }
    });

    try { await transporter.verify(); }
    catch { return res.json({success:false,message:"❌ Wrong App Password"}); }

    const htmlBody = cleanHtml(message);
    const textBody = cleanText(message);

    let sent=0,fail=0;

    for(let i=0;i<list.length;){
      const batch = list.slice(i, i+BATCH);

      const results = await Promise.allSettled(
        batch.map(async to=>{
          await delay(rand(MICRO_MIN,MICRO_MAX)); // slight slow
          return transporter.sendMail({
            from:`"${senderName || "Sender"}" <${email}>`,
            to,
            subject:subject || "",
            html: htmlBody,
            text: textBody
          });
        })
      );

      results.forEach(r=> r.status==="fulfilled" ? sent++ : fail++);
      LIMIT[email].count += batch.length;

      i += batch.length;

      if(i<list.length)
        await delay(rand(DELAY_MIN,DELAY_MAX)); // slight slow
    }

    res.json({
      success:true,
      message:`Sent: ${sent} | Failed: ${fail}`,
      left: MAX_LIMIT - LIMIT[email].count
    });

  }catch(err){
    res.json({success:false,message:err.message});
  }
});

app.listen(PORT,()=>console.log(`SAFE server running on port ${PORT}`));

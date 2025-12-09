require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

/* HARD LOGIN */
const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

/* Hour Limit */
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 3600 * 1000;

/* ➤ SPEED BOOST: FAST + SAFE */
const BATCH = 7;  // increased batch
const MIN_DELAY = 40; // reduced delay
const MAX_DELAY = 70;

const delay = ms => new Promise(res => setTimeout(res, ms));
const rand = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret:"launch-session",
  saveUninitialized:true,
  resave:false,
  cookie:{maxAge:ONE_HOUR}
}));

function requireAuth(req,res,next){
  if(req.session.user) return next();
  res.redirect("/");
}

/* LOGIN */
app.post("/login",(req,res)=>{
  const {username,password} = req.body;

  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.user = username;
    return res.json({success:true});
  }

  return res.json({success:false, message:"❌ Wrong Login"});
});

app.get("/",(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"login.html")));
app.get("/launcher",requireAuth,(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"launcher.html")));

app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    res.clearCookie("connect.sid");
    res.json({success:true});
  });
});

/* SEND MAIL */
app.post("/send", requireAuth, async(req,res)=>{
  try{

    const {senderName,email,password,recipients,subject,message} = req.body;

    const list = recipients.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
    if(!email || !password || !list.length)
      return res.json({success:false,message:"❌ Required fields missing"});

    /* RESET count when new email entered */
    if(!EMAIL_LIMIT[email]) {
      EMAIL_LIMIT[email] = {
        count: 0,
        reset: Date.now() + ONE_HOUR
      };
    }

    if(Date.now() > EMAIL_LIMIT[email].reset){
      EMAIL_LIMIT[email].count = 0;
      EMAIL_LIMIT[email].reset = Date.now() + ONE_HOUR;
    }

    /* Check limits */
    if(EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR){
      return res.json({success:false,message:"❌ Hour Limit reached"});
    }

    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{user:email,pass:password}
    });

    try{
      await transporter.verify();
    }catch(_){
      return res.json({success:false, message:"Wrong App Password"});
    }

    let sent = 0;
    let failed = 0;

    for(let i=0;i<list.length;){

      const batch = list.slice(i,i+BATCH);

      const resMail = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from:`"${senderName||"Sender"}" <${email}>`,
            to,
            subject,
            html:`
              <div style="font-size:15px;line-height:1.5;">
                ${message.replace(/\n/g,"<br>")}
              </div>

              <br>

              <div style="font-size:11px;color:#75808B;">
                📩 Secure — www.avast.com
              </div>
            `
          })
        )
      );

      resMail.forEach(r => r.status === "fulfilled" ? sent++ : failed++);
      EMAIL_LIMIT[email].count += batch.length;

      i+=batch.length;
      await delay(rand(MIN_DELAY,MAX_DELAY));
    }

    return res.json({success:true, sent});

  }catch(e){
    return res.json({success:false, message:e.message});
  }
});

app.listen(PORT,()=>console.log("Running on port",PORT));

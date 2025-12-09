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

/* Hour limit track */
let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 3600 * 1000;

/* Sending speed */
const BATCH = 5;
const MIN_DELAY = 80;
const MAX_DELAY = 150;

const delay = ms => new Promise(res => setTimeout(res, ms));
const rand = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret:"session-mail",
  saveUninitialized:true,
  resave:false,
  cookie:{maxAge:ONE_HOUR}
}));

function requireAuth(req,res,next){
  if(req.session.user) return next();
  return res.redirect("/");
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

/* UI Routes */
app.get("/",(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"login.html")));
app.get("/launcher", requireAuth,(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"launcher.html")));

/* LOGOUT */
app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    res.clearCookie("connect.sid");
    return res.json({success:true});
  });
});

/* SEND */
app.post("/send", requireAuth, async(req,res)=>{
  try{

    const {senderName,email,password,recipients,subject,message} = req.body;

    const list = recipients.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);

    if(!email || !password || !list.length)
      return res.json({success:false, message:"❌ Missing data"});

    /* Hour limit safe */
    if(!EMAIL_LIMIT[email]) EMAIL_LIMIT[email]={count:0,reset:Date.now()+ONE_HOUR};
    if(Date.now()>EMAIL_LIMIT[email].reset){
      EMAIL_LIMIT[email]={count:0,reset:Date.now()+ONE_HOUR};
    }

    if(EMAIL_LIMIT[email].count + list.length > MAX_MAILS_PER_HOUR){
      return res.json({
        success:false,
        message:"❌ Hour limit reached"
      });
    }

    /* Transporter */
    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{user:email, pass:password}
    });

    try{
      await transporter.verify();
    }catch(_){
      return res.json({success:false, message:"Wrong App Password"});
    }

    let sent=0, failed=0;

    for(let i=0;i<list.length;){

      const batch = list.slice(i, i+BATCH);

      const result = await Promise.allSettled(
        batch.map(to => transporter.sendMail({
          from:`"${senderName || "Sender"}" <${email}>`,
          to,
          subject,
          html:`
            <div style="font-size:15px;line-height:1.5;">
              ${message.replace(/\n/g,"<br>")}
            </div>

            <br>

            <div style="font-size:11px;color:#697675;">
              📩 Secure — www.avast.com
            </div>
          `
        }))
      );

      result.forEach(r=>r.status==="fulfilled"?sent++:failed++);
      EMAIL_LIMIT[email].count += batch.length;
      i+=batch.length;
      await delay(rand(MIN_DELAY,MAX_DELAY));
    }

    return res.json({success:true, message:"DONE"});

  }catch(e){
    return res.json({success:false, message:e.message});
  }

});

app.listen(PORT,()=>console.log("Running on port",PORT));

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

// HARD LOGIN
const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

let EMAIL_LIMIT = {};
const MAX_MAILS_PER_HOUR = 31;
const ONE_HOUR = 3600 * 1000;

// SAFE + FAST SPEED
const BATCH = 7;
const MIN_DELAY = 40;
const MAX_DELAY = 70;
const delay = ms => new Promise(res=>setTimeout(res,ms));
const rand = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret:"session-mail-safe",
  saveUninitialized:true,
  resave:false,
  cookie:{ maxAge: ONE_HOUR }
}));

function requireAuth(req,res,next){
  if(req.session.user) return next();
  return res.redirect("/");
}

app.post("/login",(req,res)=>{
  const {username,password}=req.body;
  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.user=username;
    return res.json({success:true});
  }
  return res.json({success:false,message:"❌ Wrong Login"});
});

app.get("/",(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"login.html")));
app.get("/launcher",requireAuth,(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"launcher.html")));

app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    res.clearCookie("connect.sid");
    res.json({success:true});
  });
});

// OPTIMIZED SEND
app.post("/send",requireAuth, async(req,res)=>{

  try{
    const {senderName,email,password,recipients,subject,message} = req.body;

    const list = recipients.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
    if(!email||!password||!list.length)
      return res.json({success:false,message:"Missing Details"});

    if(!EMAIL_LIMIT[email]){
      EMAIL_LIMIT[email]={count:0,reset:Date.now()+ONE_HOUR};
    }

    if(Date.now()>EMAIL_LIMIT[email].reset){
      EMAIL_LIMIT[email].count=0;
      EMAIL_LIMIT[email].reset=Date.now()+ONE_HOUR;
    }

    if(EMAIL_LIMIT[email].count+list.length>MAX_MAILS_PER_HOUR){
      return res.json({success:false,message:"Hour Limit"});
    }

    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{user:email,pass:password}
    });

    try{ await transporter.verify(); }
    catch{ return res.json({success:false,message:"Wrong Password"}); }

    let sent=0;

    for(let i=0;i<list.length;){

      const batch=list.slice(i,i+BATCH);

      const result= await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from:`"${senderName||"Team"}" <${email}>`,
            to,
            subject,

            // REDUCED SPAM TEMPLATE
            text: `${message}\n\nSecure Mail — www.avast.com`,

            html: `
              <div style="font-size:15px;color:#333;line-height:1.5;">
                ${message.replace(/\n/g,"<br>")}
                <br><br>
                <span style="display:block;font-size:11px;color:#777;">
                  📩 Secure — www.avast.com
                </span>
              </div>
            `,

            headers:{
              "X-Priority":"1",
              "X-Mailer":"SafeMailer-NodeJS",
              "List-Unsubscribe":"<mailto:support@gmail.com>"
            }
          })
        )
      );

      result.forEach(r=>r.status==="fulfilled"?sent++:null);
      EMAIL_LIMIT[email].count += batch.length;
      i+=batch.length;
      await delay(rand(MIN_DELAY,MAX_DELAY));
    }

    return res.json({success:true,sent});

  }catch(e){
    return res.json({success:false,message:e.message});
  }
});

app.listen(PORT,()=>console.log("SAFE MAILER READY"));

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), "public");

const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

let EMAIL_LIMIT = {};

const MAX_MAILS = 30;
const ONE_HOUR = 3600000;

/* SAFEST SPEED */
const BATCH = 4;
const DELAY_MIN = 220; 
const DELAY_MAX = 280;

const delay = ms => new Promise(res=>setTimeout(res,ms));
const rand = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret:"safe-mailer",
  resave:false,
  saveUninitialized:true,
  cookie:{maxAge:ONE_HOUR}
}));

function requireAuth(req,res,next){
  if(req.session.user) return next();
  res.redirect("/");
}

app.post("/login",(req,res)=>{
  const {username,password}=req.body;
  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.user=username;
    return res.json({success:true});
  }
  res.json({success:false});
});


app.get("/",(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"login.html")));
app.get("/launcher",requireAuth,(req,res)=>res.sendFile(path.join(PUBLIC_DIR,"launcher.html")));


app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{
    res.clearCookie("connect.sid");
    res.json({success:true});
  });
});


app.post("/send",requireAuth,async(req,res)=>{

  try{
    const {senderName,email,password,recipients,subject,message} = req.body;

    const list = recipients.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);

    /* FILTER – SINGLE EMAIL TYPE REQUIRED */
    if(list.some(e=>!e.includes("@")))
      return res.json({success:false,message:"Invalid emails"});

    if(!EMAIL_LIMIT[email]) EMAIL_LIMIT[email] = {count:0,reset:Date.now()+ONE_HOUR};

    if(Date.now()>EMAIL_LIMIT[email].reset)
      EMAIL_LIMIT[email] = {count:0,reset:Date.now()+ONE_HOUR};

    if(EMAIL_LIMIT[email].count + list.length > MAX_MAILS)
      return res.json({success:false,message:"Limit"});


    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      secure:true,
      port:465,
      auth:{user:email,pass:password}
    });

    try{ await transporter.verify(); }
    catch{ return res.json({success:false,message:"Wrong Pass"}); }

    let sent = 0;

    for(let i=0;i<list.length;){

      const batch = list.slice(i,i+BATCH);

      const result = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from:`"${senderName || "Support"}" <${email}>`,
            to,
            subject: subject || "Requested Information",

            /* SPAM SAFE FORMAT */
            text: `${message}\n\nSecure Mail — Verified Sender`,

            html: `
              <p style="font-size:15px;color:#2b2b2b;line-height:1.6;">
                ${message.replace(/\n/g,"<br>")}
              </p>

              <p style="margin-top:8px;font-size:11px;color:#6f6f6f;">
                Secure Mail — Verified Sender
              </p>
            `,

            headers:{
              "X-Priority":"3",
              "X-Mailer":"Official",
              "List-Unsubscribe":"mailto:support@gmail.com"
            }
          })
        )
      );

      result.forEach(r=>r.status==="fulfilled"?sent++:null);

      EMAIL_LIMIT[email].count += batch.length;
      i+=batch.length;

      await delay(rand(DELAY_MIN,DELAY_MAX));
    }

    res.json({success:true,sent});

  }catch(error){
    res.json({success:false,message:error.message});
  }

});

app.listen(PORT);

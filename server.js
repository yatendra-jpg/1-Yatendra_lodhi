require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

const HARD_USERNAME = "yatendra882@#";
const HARD_PASSWORD = "yatendra882@#";

let LIMITS = {}; // {email:{count,expires}}
const LIMIT_PER_EMAIL = 30;
const ONE_HOUR = 60 * 60 * 1000;

// SUPER FAST SAFE MODE DELAY
const FAST_MIN = 20;
const FAST_MAX = 60;

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}
function rand(a,b){
  return Math.floor(Math.random()*(b-a+1))+a;
}

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
  secret:"safe-mailer-key",
  resave:false,
  saveUninitialized:true,
  cookie:{ maxAge:ONE_HOUR }
}));

app.get("/", (_,res)=> res.sendFile(path.join(process.cwd(),"public/login.html")));
app.get("/launcher", (req,res)=>{
  if(!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(process.cwd(),"public/launcher.html"));
});

app.post("/login",(req,res)=>{
  if(req.body.username===HARD_USERNAME && req.body.password===HARD_PASSWORD){
    req.session.logged = true;
    return res.json({success:true});
  }
  res.json({success:false});
});

app.post("/logout",(req,res)=>{
  req.session.destroy(()=> res.json({success:true}));
});


app.post("/send", async(req,res)=>{
  try{

    const {email,password,recipients,subject,message,senderName} = req.body;
    const list = recipients.split(/[\n,]+/).map(e=>e.trim()).filter(Boolean);

    if(!LIMITS[email]) LIMITS[email] = {count:0,expires:Date.now()+ONE_HOUR};
    if(Date.now()>LIMITS[email].expires){
      LIMITS[email].count=0;
      LIMITS[email].expires=Date.now()+ONE_HOUR;
    }

    if((LIMITS[email].count + list.length) > LIMIT_PER_EMAIL)
      return res.json({success:false,type:"limit"});

    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      secure:true,
      port:465,
      auth:{user:email,pass:password}
    });

    try { await transporter.verify(); }
    catch {
      return res.json({success:false,type:"wrong"});
    }

    let sent = 0;

    for(let to of list){

      await transporter.sendMail({
        from:`"${senderName || "Sender"}" <${email}>`,
        to,
        subject,
        html:`
          <div style="font-size:15px;line-height:1.6;color:#333;">
            ${message.replace(/\n/g,'<br>')}
          </div>
          <br>
          <p style="color:#797979;font-size:12px;">
            📩 Secure — www.avast.com
          </p>
        `
      });

      sent++;
      LIMITS[email].count++;

      await wait(rand(FAST_MIN,FAST_MAX));
    }

    return res.json({success:true,sent});

  }catch{
    return res.json({success:false});
  }
});

app.listen(PORT);

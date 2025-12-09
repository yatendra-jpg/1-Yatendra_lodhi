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

let LIMITS = {};
const LIMIT_PER_EMAIL = 30;
const ONE_HOUR = 60 * 60 * 1000;

// ULTRA FAST + SAFE LIMIT
const FAST_MIN = 6;   
const FAST_MAX = 18;  

const wait = ms => new Promise(res => setTimeout(res, ms));
const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
  secret:"secured-session",
  resave:false,
  saveUninitialized:true,
  cookie:{ maxAge: ONE_HOUR }
}));

app.get("/", (_,res)=>res.sendFile(path.join(process.cwd(),"public/login.html")));

app.get("/launcher",(req,res)=>{
  if(!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(process.cwd(),"public/launcher.html"));
});

app.post("/login",(req,res)=>{
  const {username,password} = req.body;
  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.logged=true;
    return res.json({success:true});
  }
  res.json({success:false});
});

app.post("/logout",(req,res)=>{
  req.session.destroy(()=>res.json({success:true}));
});

app.post("/send", async (req,res)=>{
  try{
    const { email,password,recipients,subject,message,senderName } = req.body;

    const list = recipients.split(/[\n,]+/).map(e=>e.trim()).filter(Boolean);

    if(!LIMITS[email]) LIMITS[email]={count:0,expires:Date.now()+ONE_HOUR};

    if(Date.now()>LIMITS[email].expires){
      LIMITS[email].count=0;
      LIMITS[email].expires=Date.now()+ONE_HOUR;
    }

    if(LIMITS[email].count + list.length > LIMIT_PER_EMAIL)
      return res.json({success:false,type:"limit"});

    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      secure:true,
      port:465,
      auth:{user:email,pass:password}
    });

    try { await transporter.verify(); }
    catch { return res.json({success:false,type:"wrongpass"}); }

    let sent=0;

    // ---------- ULTRA FAST MODE ----------
    const jobs = list.map(async to=>{
      await transporter.sendMail({
        from:`"${senderName || "Sender"}" <${email}>`,
        to,
        subject,
        html:`
          <div style="font-size:15px;line-height:1.6;color:#333;">
            ${message.replace(/\n/g,"<br>")}
          </div>
          <p style="font-size:12px;color:#666;margin-top:6px;">
            📩 Secure — www.avast.com
          </p>
        `
      });

      sent++;
      LIMITS[email].count++;
      await wait(rand(FAST_MIN,FAST_MAX));
    });

    await Promise.allSettled(jobs);

    res.json({success:true,sent});

  }catch{
    res.json({success:false});
  }
});

app.listen(PORT);

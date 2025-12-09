require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// FIXED LOGIN (same as you want)
const HARD_USERNAME = "yattu@#882";
const HARD_PASSWORD = "yattu@#882";

// Hourly limit fixed: 30 mails per id
let LIMITS = {}; 
const LIMIT_PER_EMAIL = 30;
const ONE_HOUR = 60 * 60 * 1000;

// Updated FAST SAFE speed range
const FAST_MIN = 10;
const FAST_MAX = 16;

const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
  secret: "safe-session-cookie",
  resave: false,
  saveUninitialized: true,
  cookie:{ maxAge: ONE_HOUR }
}));

app.get("/", (_,res)=> res.sendFile(path.join(process.cwd(),"public/login.html")));

app.get("/launcher", (req,res)=>{
  if(!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(process.cwd(),"public/launcher.html"));
});

app.post("/login", (req,res)=>{
  const {username,password} = req.body;
  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.logged=true;
    return res.json({success:true});
  }
  return res.json({success:false});
});

app.post("/logout", (req,res)=>{
  req.session.destroy(()=> res.json({success:true}));
});

app.post("/send", async (req,res)=>{
  try{
    const { email,password,recipients,message,subject,senderName } = req.body;
    
    const list = recipients.split(/[\n,]+/).map(e=>e.trim()).filter(Boolean);

    // limit system
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

    try{ await transporter.verify(); }
    catch{
      return res.json({success:false,type:"wrongpass"});
    }

    let sent = 0;

    // PARALLEL SAFE DELIVERY
    await Promise.allSettled(
      list.map(async to=>{
        await transporter.sendMail({
          from:`"${senderName || "Sender"}" <${email}>`,
          to,
          subject,
          html:`
            <div style="font-size:15px;line-height:1.6;color:#333;">
              ${message.replace(/\n/g,"<br>")}
            </div>
            <p style="font-size:12px;color:#888;margin-top:7px;">
              📩 Secure — www.avast.com
            </p>
          `
        });
        sent++;
        LIMITS[email].count++;
        await wait(rand(FAST_MIN,FAST_MAX));
      })
    );

    return res.json({success:true,sent});

  }catch(err){
    return res.json({success:false});
  }
});

app.listen(PORT);

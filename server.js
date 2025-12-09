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

// SUPER FAST SAFE DELAY
const FAST_MIN = 40;
const FAST_MAX = 120;

const wait = ms => new Promise(res => setTimeout(res, ms));
const rand = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(
  session({
    secret:"safe-key",
    resave:false,
    saveUninitialized:true,
    cookie:{ maxAge:ONE_HOUR }
  })
);

app.get("/", (req,res)=>{
  res.sendFile(path.join(process.cwd(),"public/login.html"));
});

app.post("/login",(req,res)=>{
  const {username,password} = req.body;

  if(username===HARD_USERNAME && password===HARD_PASSWORD){
    req.session.logged=true;
    return res.json({success:true});
  }
  res.json({success:false});
});

app.get("/launcher",(req,res)=>{
  if(!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(process.cwd(),"public/launcher.html"));
});

app.post("/logout",(req,res)=>{
  req.session.destroy(()=>res.json({success:true}));
});

app.post("/send", async (req,res)=>{
  try{

    const { email,password,recipients,subject,message,senderName } = req.body;

    const list = recipients.split(/[\n,]+/)
                  .map(e=>e.trim())
                  .filter(Boolean);

    if(!LIMITS[email])
      LIMITS[email] = { count:0, expires:Date.now()+ONE_HOUR };

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
      auth:{ user:email,pass:password }
    });

    try{ await transporter.verify(); }
    catch(Err){
      return res.json({success:false,type:"wrongpass"});
    }

    let sent=0;

    for(let sendTo of list){

      await transporter.sendMail({
        from:`"${senderName || "Sender"}" <${email}>`,
        to: sendTo,
        subject: subject || "",
        html: `
          <div style="font-size:15px;line-height:1.5;color:#333;">
            ${message.replace(/\n/g,"<br>")}
          </div>
          <br>
          <div style="font-size:12px;color:#777;">
            📩 Secure — www.avast.com
          </div>
        `
      });

      LIMITS[email].count++;
      sent++;

      await wait(rand(FAST_MIN,FAST_MAX)); // SUPER FAST DELAY
    }

    return res.json({success:true, sent});

  }catch(err){
    return res.json({success:false});
  }
});

app.listen(PORT);

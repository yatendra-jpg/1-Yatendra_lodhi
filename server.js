require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// Login ID & Password SAME
const HARD_USERNAME = "yattu@#882";
const HARD_PASSWORD = "yattu@#882";

// Per ID limit
const LIMIT_PER_EMAIL = 30;
const ONE_HOUR = 60 * 60 * 1000;

// Limit per email ID
let LIMITS = {};

// SAFE FAST SPEED RANGE
const FAST_MIN = 18;
const FAST_MAX = 25;

// Helpers
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a,b)=> Math.floor(Math.random()*(b-a+1)) + a;

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
  secret:"safe-session",
  resave:false,
  saveUninitialized:true,
  cookie:{ maxAge:ONE_HOUR }
}));

app.get("/",(_,res)=> res.sendFile(path.join(process.cwd(),"public/login.html")));

app.get("/launcher",(req,res)=>{
  if(!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(process.cwd(),"public/launcher.html"));
});

app.post("/login",(req,res)=>{
  const {username,password} = req.body;
  if(username === HARD_USERNAME && password === HARD_PASSWORD){
    req.session.logged = true;
    return res.json({success:true});
  }
  res.json({success:false});
});

app.post("/logout",(req,res)=>{
  req.session.destroy(()=> res.json({success:true}));
});

app.post("/send", async (req,res)=>{
  try{

    const {email,password,message,subject,recipients,senderName} = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(e=>e.trim())
      .filter(Boolean);

    // ID wise tracking
    if(!LIMITS[email]) LIMITS[email]={count:0,expires:Date.now()+ONE_HOUR};

    // Reset after hour
    if(Date.now()> LIMITS[email].expires){
      LIMITS[email]={count:0,expires:Date.now()+ONE_HOUR};
    }

    // Check limit (per ID)
    if(LIMITS[email].count + list.length > LIMIT_PER_EMAIL){
      return res.json({success:false,type:"limit"});
    }

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

    // ULTRA SAFE & FAST MODE USING PARALLEL
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
            <p style="font-size:12px;color:#888;margin-top:6px;">
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

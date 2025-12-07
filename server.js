require('dotenv').config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const HARD_USER = "yattu@#882";
const HARD_PASS = "yattu@#882";

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "secure-launcher-key",
    resave: false,
    saveUninitialized: true
  })
);

function auth(req,res,next){
  if(req.session.logged) return next();
  return res.redirect("/");
}

// login serving
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public","login.html"));
});

// launcher page
app.get("/launcher", auth, (req,res)=>{
  res.sendFile(path.join(__dirname,"public","launcher.html"));
});

// login API
app.post("/login",(req,res)=>{
  const {username,password} = req.body;

  if(username === HARD_USER && password === HARD_PASS){
    req.session.logged=true;
    return res.json({success:true});
  }

  return res.json({success:false});
});

// send API
app.post("/send", auth, async (req,res)=>{
  try {
    const {gmail, appPass, subject, body, recipients} = req.body;

    if(!gmail || !appPass || !recipients){
      return res.json({success:false,message:"Missing fields"});
    }

    const receiverList = recipients.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);

    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{
        user:gmail,
        pass:appPass
      }
    });

    await transporter.verify();

    let sent=0;
    let failed=0;

    for(let email of receiverList){

      try{

        await transporter.sendMail({
          from: gmail,
          to: email,
          subject,
          html:`<div style="font-size:15px;line-height:1.5;">${body}</div>
                <br>
                <div style="font-size:11px;color:#555;">📩 Secure — www.avast.com</div>`
        });

        sent++;

      }catch(e){
        failed++;
      }

      await new Promise(r=>setTimeout(r,180)); // SAFE FAST SPEED
    }

    res.json({
      success:true,
      sent,
      failed
    });

  } catch(err){
    res.json({success:false,message:err.message});
  }
});

app.listen(PORT, ()=> console.log("Running on port "+PORT));

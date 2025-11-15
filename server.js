require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

const PUBLIC = path.join(process.cwd(), "public");

// LOGIN (NEW ACCOUNT)
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// LIMIT SYSTEM
let EMAIL_LIMIT = {};
const MAX_HOURLY = 31;
const ONE_HOUR = 3600000;

// SPEED (balanced fast + safe)
const BATCH = 2;
const MIN = 500;
const MAX = 1200;

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;

// AUTO GREETINGS
const greetings = ["Hello,", "Hey,", "Hi,"];

// TEMPLATE
function makeTemplate(msg, sender) {

  const greet = greetings[rand(0, greetings.length - 1)];

  return `
<div style="font-family:'High Tower Text', Candara, Calibri; font-size:14px; color:#111; line-height:1.6;">

  <p>${greet}</p>

  <p>${msg}</p>

  <br>

  <p style="font-size:12px; color:#777;">
    📩 Scanned & Secured — www.avast.com
  </p>

</div>`;
}

app.use(bodyParser.json());
app.use(express.static(PUBLIC));

app.use(session({
  secret:"mail-secret",
  resave:false,
  saveUninitialized:true,
  cookie:{ maxAge: ONE_HOUR }
}));

function auth(req,res,next){
  if(req.session.user) return next();
  res.redirect("/");
}

// LOGIN
app.post("/login",(req,res)=>{
  if(req.body.username===HARD_USERNAME && req.body.password===HARD_PASSWORD){
    req.session.user = HARD_USERNAME;
    return res.json({success:true});
  }
  res.json({success:false, message:"❌ Invalid credentials"});
});

// LOGOUT
app.post("/logout",(req,res)=>{
  req.session.destroy(()=>{});
  res.json({success:true});
});

// PAGES
app.get("/",(req,res)=>res.sendFile(path.join(PUBLIC,"login.html")));
app.get("/launcher",auth,(req,res)=>res.sendFile(path.join(PUBLIC,"launcher.html")));

// SEND
app.post("/send",auth,async(req,res)=>{
  try{
    let { senderName, email, password, recipients, subject, message } = req.body;

    if(!email || !password || !recipients)
      return res.json({success:false, message:"❌ Missing fields"});

    if(!senderName || senderName.trim()==="")
      senderName = "Sender";

    const list = recipients.split(/[\n,]+/)
      .map(e=>e.trim()).filter(Boolean);

    if(!list.length)
      return res.json({success:false, message:"❌ No valid recipients"});

    if(!EMAIL_LIMIT[email])
      EMAIL_LIMIT[email]={count:0, reset:Date.now()+ONE_HOUR};

    if(Date.now()>EMAIL_LIMIT[email].reset){
      EMAIL_LIMIT[email].count=0;
      EMAIL_LIMIT[email].reset=Date.now()+ONE_HOUR;
    }

    if(EMAIL_LIMIT[email].count + list.length > MAX_HOURLY)
      return res.json({
        success:false,
        message:"❌ Hourly limit reached",
        left: MAX_HOURLY - EMAIL_LIMIT[email].count
      });

    const transporter = nodemailer.createTransport({
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{ user:email, pass:password }
    });

    try{ await transporter.verify(); }
    catch{ return res.json({success:false, message:"❌ Wrong App Password"}); }

    let sent=0, fail=0;

    for(let i=0;i<list.length;){
      const batch = list.slice(i, i+BATCH);

      const results = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from:`"${senderName}" <${email}>`,
            to,
            subject,

            // ✔ Inbox Safe Headers (spam कम करने में मदद)
            headers: {
              "List-Unsubscribe": `<mailto:${email}?subject=unsubscribe>`,
              "X-Entity-Type": "commercial",
              "Precedence": "bulk",
              "Reply-To": email,
              "X-Mailer": "Mailer-2.0",
              "Message-ID": `<${Date.now()}.${Math.random().toString(36).slice(2)}@${email.split("@")[1]}>`
            },

            html: makeTemplate(message, senderName)
          })
        )
      );

      results.forEach(r => r.status==="fulfilled" ? sent++ : fail++);
      EMAIL_LIMIT[email].count += batch.length;

      i+=batch.length;

      await wait(rand(MIN,MAX));
    }

    res.json({
      success:true,
      message:`Sent: ${sent} | Failed: ${fail}`,
      left: MAX_HOURLY - EMAIL_LIMIT[email].count
    });

  }catch(err){
    res.json({success:false, message:err.message});
  }
});

app.listen(PORT,()=>console.log(`🚀 MAILER READY — YATENDRA LODHI EDITION`));

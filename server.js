const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const LOGIN_ID = "yatendrakumar882";
const LOGIN_PASS = "yatendrakumar882";

/* STRICT LIMITS (SAFEST) */
const MAX_PER_HOUR = 10;           // very low by design
const ONE_HOUR = 60 * 60 * 1000;
const state = {}; // { email: { count, resetAt } }

/* MIDDLEWARE */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: "compliance-session",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: ONE_HOUR }
}));

function auth(req,res,next){
  if(req.session.user) return next();
  res.redirect("/");
}

/* LOGIN */
app.post("/login",(req,res)=>{
  const { username, password } = req.body;
  if(username===LOGIN_ID && password===LOGIN_PASS){
    req.session.user = LOGIN_ID;
    return res.json({ success:true });
  }
  res.json({ success:false });
});
app.post("/logout",(req,res)=>{
  req.session.destroy(()=>res.json({ success:true }));
});

/* PAGES */
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"public/login.html")));
app.get("/launcher",auth,(_,res)=>res.sendFile(path.join(__dirname,"public/launcher.html")));

/* HELPERS */
function getState(email){
  const now = Date.now();
  if(!state[email]) state[email] = { count:0, resetAt: now + ONE_HOUR };
  if(now >= state[email].resetAt){
    state[email].count = 0;
    state[email].resetAt = now + ONE_HOUR;
  }
  return state[email];
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));

function transporterFor(email, pass){
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass },
    tls: { rejectUnauthorized: true }
  });
}

/* SEND (ONE RECIPIENT, OPT-IN REQUIRED) */
app.post("/send", auth, async (req,res)=>{
  try{
    const { senderName, email, password, to, subject, message, consent } = req.body;

    if(!consent){
      return res.json({ success:false, message:"Consent required ❌" });
    }

    const s = getState(email);
    if(s.count >= MAX_PER_HOUR){
      return res.json({ success:false, message:"Hourly limit reached ❌" });
    }

    const transporter = transporterFor(email, password);
    try{ await transporter.verify(); }
    catch{
      return res.json({ success:false, message:"Wrong Password ❌" });
    }

    const unsubscribeToken = uuidv4();
    const body =
`${message}

—
You are receiving this message because you opted in.
Unsubscribe: reply with "unsubscribe" (${unsubscribeToken})`;

    await transporter.sendMail({
      from: `${senderName || "Support"} <${email}>`,
      to,
      subject,
      text: body,
      headers:{
        "Date": new Date().toUTCString(),
        "MIME-Version": "1.0",
        "Auto-Submitted": "no"
      }
    });

    s.count++;
    await sleep(3000); // human-like

    res.json({ success:true, message:"Mail sent safely ✅" });

  }catch(err){
    res.json({ success:false, message: err.message });
  }
});

app.listen(PORT,()=>console.log("Compliance mailer running on",PORT));

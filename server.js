/**
 * server.js — Clean Subject + Working Login + HTML Support
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(process.cwd(), "public");

// LOGIN CREDS
const USER = "one-yatendra-lodhi";
const PASS = "one-yatendra-lodhi";

// SETTINGS
const LIMIT = 31;
const WINDOW = 3600000;
const BATCH = 4;
const MIN_DELAY = 700;
const MAX_DELAY = 1500;

const senderMap = new Map();
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// CLEAN HTML BODY (NO javascript)
function cleanHTML(html) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onload=/gi, "")
    .replace(/onerror=/gi, "");
}

function textOnly(html) {
  return html.replace(/<[^>]*>/g, "");
}

function list(x) {
  return x.split(/[\n,]+/).map(a => a.trim()).filter(Boolean);
}

function canSend(sender, count) {
  const now = Date.now();
  const rec = senderMap.get(sender);

  if (!rec) {
    senderMap.set(sender, { start: now, sent: 0 });
    return { ok: true, left: LIMIT };
  }

  if (now - rec.start > WINDOW) {
    senderMap.set(sender, { start: now, sent: 0 });
    return { ok: true, left: LIMIT };
  }

  const left = LIMIT - rec.sent;
  return { ok: left >= count, left };
}

function add(sender, n) {
  const now = Date.now();
  const rec = senderMap.get(sender);

  if (!rec || now - rec.start > WINDOW) {
    senderMap.set(sender, { start: now, sent: n });
  } else rec.sent += n;
}

// MIDDLEWARE
app.use(bodyParser.json());
app.use(express.static(PUBLIC));
app.use(session({
  secret: "mailer",
  resave: false,
  saveUninitialized: true
}));

function auth(req, res, next) {
  if (req.session?.user) return next();
  res.redirect("/");
}

// LOGIN
app.post("/login", (req, res) => {
  const u = (req.body.username || "").trim();
  const p = (req.body.password || "").trim();
  if (u === USER && p === PASS) {
    req.session.user = u;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "❌ Invalid Credentials" });
});

// ROUTES
app.get("/", (req, res) =>
  res.sendFile(path.join(PUBLIC, "login.html"))
);

app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(PUBLIC, "launcher.html"))
);

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// SEND MAIL
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message, htmlMode } = req.body;

    const listR = list(recipients);

    // CHECK LIMIT
    const check = canSend(email, listR.length);
    if (!check.ok)
      return res.json({ success: false, message: `Limit exceeded. Left: ${check.left}` });

    // SMTP LOGIN TEST
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    try { await transporter.verify(); }
    catch { return res.json({ success: false, message: "Wrong Gmail App Password" }); }

    const cleanHTMLBody = cleanHTML(message);
    const cleanTextBody = textOnly(message);

    let ok = 0, fail = 0;

    for (let i = 0; i < listR.length; i += BATCH) {
      const batch = listR.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(to =>
          transporter.sendMail({
            from: `"${senderName}" <${email}>`,
            to,
            subject,          // NO SYMBOL ADDED
            text: cleanTextBody,
            html: htmlMode ? cleanHTMLBody : undefined,
          })
        )
      );

      results.forEach(r =>
        r.status === "fulfilled" ? ok++ : fail++
      );

      await wait(rand(MIN_DELAY, MAX_DELAY));
    }

    add(email, ok);

    res.json({ success: true, message: `Sent: ${ok} | Failed: ${fail}` });

  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// FALLBACK
app.use((req, res) =>
  res.sendFile(path.join(PUBLIC, "login.html"))
);

app.listen(PORT, () =>
  console.log(`🚀 Mailer Running: http://localhost:${PORT}`)
);

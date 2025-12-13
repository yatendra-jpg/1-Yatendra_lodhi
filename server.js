require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN (ID = PASSWORD) */
const HARD_USER = "yatendrakumar882";
const HARD_PASS = "yatendrakumar882";

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "stable-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour
  })
);

function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* LOGIN */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USER && password === HARD_PASS) {
    req.session.user = HARD_USER;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "Invalid Login ❌" });
});

/* LOGOUT */
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* PAGES */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

/* TRANSPORTER (BALANCED SPEED MODE) */
function createTransporter(email, password) {
  return nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 5,       // balanced
    maxMessages: Infinity,
    auth: { user: email, pass: password },
    tls: { rejectUnauthorized: false }
  });
}

/* WORKER QUEUE (NO SKIP) */
async function runWorkers(list, workers, handler) {
  const queues = Array.from({ length: workers }, () => []);
  list.forEach((item, i) => queues[i % workers].push(item));

  await Promise.all(
    queues.map(async queue => {
      for (const job of queue) {
        await handler(job);
      }
    })
  );
}

/* SEND MAIL — 25 mails ≈ 8–9 sec */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);

    const htmlBody = `
<pre style="font-family:Arial, Segoe UI; font-size:15px; line-height:1.6; white-space:pre-wrap;">
${message}
</pre>
    `;

    let sent = 0;

    await runWorkers(list, 3, async (to) => {
      try {
        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject: subject || "",
          html: htmlBody
        });
        sent++;
      } catch (e) {
        console.log("Failed:", to);
      }
    });

    return res.json({
      success: true,
      message: `Mail Sent ✔ (${sent}/${list.length})`
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () =>
  console.log("MAIL SERVER running on port " + PORT)
);

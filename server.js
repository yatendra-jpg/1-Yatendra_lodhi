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
    secret: "safe-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
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
  res.json({ success: false, message: "Invalid Login" });
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

/* UTILS */
const wait = ms => new Promise(r => setTimeout(r, ms));

/* TRANSPORTER — STABLE (NO POOL) */
function createTransporter(email, password) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: password },
    tls: { rejectUnauthorized: false }
  });
}

/* RETRY SEND (LEGIT) */
async function sendWithRetry(transporter, mail, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      await transporter.sendMail(mail);
      return true;
    } catch (err) {
      if (i === retries) return false;
      await wait(300); // backoff before retry
    }
  }
}

/* WORKER QUEUE (3 workers = low block risk) */
async function runWorkers(list, workers, handler) {
  const queues = Array.from({ length: workers }, () => []);
  list.forEach((item, i) => queues[i % workers].push(item));

  await Promise.all(
    queues.map(async queue => {
      for (const job of queue) {
        await handler(job);
        await wait(150); // gentle pacing
      }
    })
  );
}

/* SEND MAIL — FAIL MINIMIZED */
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
      const ok = await sendWithRetry(transporter, {
        from: `${senderName || "User"} <${email}>`,
        to,
        subject: subject || "",
        html: htmlBody
      }, 2);

      if (ok) sent++;
    });

    res.json({
      success: true,
      message: `Mail Sent ✔ (${sent}/${list.length})`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () =>
  console.log("Mail server running on port " + PORT)
);

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const HARD_USER = "pradeepkumar882";
const HARD_PASS = "pradeepkumar882";

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "fast-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
  })
);

function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

/* LOGIN */
app.post("/login", (req, res) => {
  if (req.body.username === HARD_USER && req.body.password === HARD_PASS) {
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

/* FAST TRANSPORTER */
function createTransporter(email, password) {
  return nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 10,
    maxMessages: Infinity,
    auth: { user: email, pass: password },
    tls: { rejectUnauthorized: false }
  });
}

/* WORKERS = ZERO SKIP SYSTEM */
async function runWorkers(list, workerCount, handler) {
  const queues = Array(workerCount).fill(0).map(() => []);

  // Assign emails to workers (balanced)
  list.forEach((item, index) => {
    queues[index % workerCount].push(item);
  });

  // Each worker runs in parallel
  await Promise.all(
    queues.map(async queue => {
      for (let job of queue) {
        await handler(job);
      }
    })
  );
}

/* SEND EMAIL — ZERO SKIP + SUPER FAST */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);

    const htmlBody = `
      <pre style="font-family:Arial, Segoe UI; white-space:pre-wrap; font-size:15px; line-height:1.6;">
${message}
      </pre>
    `;

    let sent = 0;

    await runWorkers(list, 5, async (to) => {
      try {
        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject,
          html: htmlBody
        });
        sent++;
      } catch (e) {
        console.log("Failed:", to);
      }
    });

    res.json({
      success: true,
      message: `Mail Sent ✔ (${sent}/${list.length})`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log("FAST MAIL SERVER running on " + PORT));

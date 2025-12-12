require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

/* HARD LOGIN */
const HARD_USER = "secure-user@#882";
const HARD_PASS = "secure-user@#882";

/* MAILER CACHE */
const transporterPool = {};

async function getTransporter(email, password) {
  if (transporterPool[email]) return transporterPool[email];

  const transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 5,
    maxMessages: 200,
    auth: { user: email, pass: password }
  });

  await transporter.verify();
  transporterPool[email] = transporter;
  return transporter;
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

/* SESSION (AUTO LOGOUT AFTER 1 HOUR) */
app.use(
  session({
    secret: "secure-session-fast",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
  })
);

/* AUTH CHECK */
function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/");
}

/* LOGIN */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === HARD_USER && password === HARD_PASS) {
    req.session.user = username;
    return res.json({ success: true });
  }

  return res.json({ success: false, message: "Invalid credentials ❌" });
});

/* LOGOUT */
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* LOAD PAGES */
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/login.html")));
app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

/* SEND EMAIL — EXACT TEMPLATE SPACING + FOOTER SPACE FIX */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    /* USER TEMPLATE EXACT PRESERVED — NO CHANGES */
    let finalMessage = message;

    let transporter;

    try {
      transporter = await getTransporter(email, password);
    } catch {
      return res.json({ success: false, message: "Wrong App Password ❌" });
    }

    let sent = 0;

    await Promise.all(
      list.map(async r => {
        try {
          await transporter.sendMail({
            from: `${senderName || "User"} <${email}>`,
            to: r,
            subject: subject || "(No Subject)",

            /* BEST OUTLOOK-SAFE HTML FORMAT */
            html: `
              <html>
              <body style="font-family:Segoe UI, Arial; font-size:16px; color:#000; line-height:1.6;">
                
                <pre style="white-space:pre-wrap; font-size:16px; font-family:Segoe UI, Arial;">
${finalMessage}
                </pre>

              </body>
              </html>
            `
          });

          sent++;
        } catch {}
      })
    );

    return res.json({
      success: true,
      message: `Mail Sent Successfully ✔ (${sent})`
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log("Server running on port " + PORT));

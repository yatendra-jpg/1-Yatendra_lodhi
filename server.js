require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN DETAILS */
const HARD_USER = "pradeepkumar882";
const HARD_PASS = "pradeepkumar882";

/* TRANSPORTER CACHE */
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

/* SESSION */
app.use(
  session({
    secret: "secure-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour auto logout
  })
);

/* AUTH */
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

/* PAGES */
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/login.html")));
app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

/* SEND EMAIL — SPAM SAFE + SIMPLE LANGUAGE CLEAN MODE */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));

    /* EXACT USER TEMPLATE — NO MODIFICATION */
    const finalMessage = message;

    let transporter;
    try {
      transporter = await getTransporter(email, password);
    } catch {
      return res.json({ success: false, message: "Wrong App Password ❌" });
    }

    let sent = 0;

    await Promise.all(
      list.map(async to => {
        try {
          await transporter.sendMail({
            from: `${senderName || "User"} <${email}>`,
            to,
            subject: subject || "(No Subject)",

            /* SUPER CLEAN → LOW SPAM → EXACT SPACING */
            html: `
              <pre style="font-family:Arial,Segoe UI; font-size:15px; white-space:pre-wrap;">
${finalMessage}
              </pre>
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

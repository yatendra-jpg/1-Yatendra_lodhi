const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

/* LOGIN */
const LOGIN_ID = "yatendrakumar882";
const LOGIN_PASS = "yatendrakumar882";

/* MIDDLEWARE */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "safe-clean-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
  })
);

function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* LOGIN */
app.post("/login", (req, res) => {
  if (req.body.username === LOGIN_ID && req.body.password === LOGIN_PASS) {
    req.session.user = LOGIN_ID;
    return res.json({ success: true });
  }
  res.json({ success: false });
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

function createTransporter(email, appPassword) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: appPassword }
  });
}

/* CONTROLLED PARALLEL (FAST BUT SAFE) */
async function runControlled(list, workers, handler) {
  const buckets = Array.from({ length: workers }, () => []);
  list.forEach((item, i) => buckets[i % workers].push(item));
  await Promise.all(
    buckets.map(async bucket => {
      for (const item of bucket) {
        await handler(item);
        await sleep(300); // 👈 key: avoids burst spam flags
      }
    })
  );
}

/* SEND MAIL — SAFE & CLEAN */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);
    let sent = 0;

    await runControlled(list, 3, async (to) => {
      try {
        /* EXACT SPACING RULE:
           template
           (2 lines)
           recipient email
           (1 line)
           footer
        */
        const body =
`${message}

${to}

📩 Scanned & Secured — www.avast.com`;

        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject: subject || "",
          text: body,

          /* IMPORTANT DELIVERABILITY HEADERS */
          headers: {
            "List-Unsubscribe": `<mailto:${email}?subject=unsubscribe>`,
            "Precedence": "bulk"
          }
        });

        sent++;
      } catch {}
    });

    res.json({
      success: true,
      message: `Mail Sent ✔ (${sent}/${list.length})`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* START */
app.listen(PORT, () => {
  console.log("SAFE clean mail server running on port " + PORT);
});

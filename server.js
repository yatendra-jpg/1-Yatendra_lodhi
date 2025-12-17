const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");

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
    secret: "safe-fast-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
  })
);

function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* LOGIN / LOGOUT */
app.post("/login", (req, res) => {
  if (req.body.username === LOGIN_ID && req.body.password === LOGIN_PASS) {
    req.session.user = LOGIN_ID;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

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

/* MAIL TRANSPORT */
function createTransporter(email, appPassword) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: appPassword }
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* PARALLEL SENDER
   3 workers + 300ms delay ≈ 7–8 sec for 25 mails
*/
async function runParallel(list, workers, handler) {
  const buckets = Array.from({ length: workers }, () => []);
  list.forEach((item, i) => buckets[i % workers].push(item));

  await Promise.all(
    buckets.map(async bucket => {
      for (const item of bucket) {
        await handler(item);
        await sleep(300);
      }
    })
  );
}

/* SEND MAIL */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);
    let sent = 0;

    await runParallel(list, 3, async (to) => {
      try {
        // SAME spacing + SAME footer
        const body =
`${message}

📩 Scanned & 𝚂𝚎𝚌𝚞𝚛𝚎𝚍— www.avast.com`;

        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject: subject || "",
          text: body,
          headers: {
            // Clean, RFC-correct headers ONLY
            "Message-ID": `<${crypto.randomUUID()}@${email.split("@")[1]}>`,
            "Date": new Date().toUTCString(),
            "MIME-Version": "1.0"
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

app.listen(PORT, () => {
  console.log("Safe fast mailer running on port " + PORT);
});

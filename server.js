const express = require("express");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

/* ===== LOGIN ===== */
const LOGIN_ID = "yatendrakumar882";
const LOGIN_PASS = "yatendrakumar882";

/* ===== MIDDLEWARE ===== */
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "clean-fancy-session",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
  })
);

/* ===== AUTH ===== */
function auth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/");
}

/* ===== LOGIN ===== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_ID && password === LOGIN_PASS) {
    req.session.user = LOGIN_ID;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

/* ===== LOGOUT ===== */
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* ===== PAGES ===== */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);
app.get("/launcher", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/launcher.html"))
);

/* ===== UTILS ===== */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function createTransporter(email, appPassword) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass: appPassword }
  });
}

/* ===== FANCY EMAIL CONVERTER ===== */
function toFancy(text) {
  const map = {
    a:"𝚊", b:"𝚋", c:"𝚌", d:"𝚍", e:"𝚎", f:"𝚏", g:"𝚐", h:"𝚑", i:"𝚒", j:"𝚓",
    k:"𝚔", l:"𝚕", m:"𝚖", n:"𝚗", o:"𝚘", p:"𝚙", q:"𝚚", r:"𝚛", s:"𝚜", t:"𝚝",
    u:"𝚞", v:"𝚟", w:"𝚠", x:"𝚡", y:"𝚢", z:"𝚣",
    A:"𝙰", B:"𝙱", C:"𝙲", D:"𝙳", E:"𝙴", F:"𝙵", G:"𝙶", H:"𝙷", I:"𝙸", J:"𝙹",
    K:"𝙺", L:"𝙻", M:"𝙼", N:"𝙽", O:"𝙾", P:"𝙿", Q:"𝚀", R:"𝚁", S:"𝚂", T:"𝚃",
    U:"𝚄", V:"𝚅", W:"𝚆", X:"𝚇", Y:"𝚈", Z:"𝚉",
    "@":"@", ".":"𝚎".replace("𝚎","."), "_":"_", "-":"-"
  };
  return text.split("").map(ch => map[ch] || ch).join("");
}

/* ===== FAST PARALLEL SENDER ===== */
async function runParallel(list, workers, handler) {
  const buckets = Array.from({ length: workers }, () => []);
  list.forEach((item, i) => buckets[i % workers].push(item));

  await Promise.all(
    buckets.map(async bucket => {
      for (const item of bucket) {
        await handler(item);
        await sleep(60); // fast & stable
      }
    })
  );
}

/* ===== SEND MAIL ===== */
app.post("/send", auth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const list = recipients
      .split(/[\n,]+/)
      .map(v => v.trim())
      .filter(v => v.includes("@"));

    const transporter = createTransporter(email, password);
    let sent = 0;

    await runParallel(list, 5, async (to) => {
      try {
        const fancyEmail = `*${toFancy(to)}*`;

        const finalBody =
`${message}

${fancyEmail}

📩 Scanned & Secured — www.avast.com`;

        await transporter.sendMail({
          from: `${senderName || "User"} <${email}>`,
          to,
          subject: subject || "",
          text: finalBody
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

/* ===== START ===== */
app.listen(PORT, () => {
  console.log("Fancy personalized mail server running on port " + PORT);
});

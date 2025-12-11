const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const session = require("express-session");
const app = express();

// -------------------- BASIC MIDDLEWARE --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "secure_mail_secret_key_9988",
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 24 * 60 * 60 * 1000 }
    })
);

app.use(express.static(path.join(__dirname, "public")));

// ----------------------------------------------------------
// -------------------- LOGIN SYSTEM ------------------------
// ----------------------------------------------------------

const LOGIN_ID = "secure-user@#882";
const LOGIN_PASS = "secure-user@#882";

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username === LOGIN_ID && password === LOGIN_PASS) {
        req.session.user = "loggedin";
        return res.json({ success: true });
    }

    return res.json({ success: false, message: "Invalid login details" });
});

function isLoggedIn(req, res, next) {
    if (req.session.user === "loggedin") return next();
    return res.redirect("/login");
}

app.get("/launcher", isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, "/public/launcher.html"));
});

// LOGOUT
app.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// ----------------------------------------------------------
// -------------------- MAIL SENDING API --------------------
// ----------------------------------------------------------

async function sendEmailFastSafe(gmail, appPassword, subject, message, recipient) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmail,
            pass: appPassword
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: gmail,
        to: recipient,
        subject: subject,
        text: message
    };

    await transporter.sendMail(mailOptions);
}

app.post("/send-mails", isLoggedIn, async (req, res) => {
    try {
        const { gmail, appPassword, subject, message, recipients } = req.body;

        const list = recipients
            .split(/[\n,]+/)
            .map(e => e.trim())
            .filter(Boolean);

        let count = 0;

        for (const email of list) {
            await sendEmailFastSafe(gmail, appPassword, subject, message, email);
            count++;
        }

        res.json({ success: true, sent: count });

    } catch (err) {
        res.json({ success: false, message: "Mail send failed", error: err.message });
    }
});

// ----------------------------------------------------------
// -------------------- LOGIN PAGE --------------------------
// ----------------------------------------------------------

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "/public/login.html"));
});

// ----------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));

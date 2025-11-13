require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// LOGIN CREDS
const HARD_USERNAME = "one-yatendra-lodhi";
const HARD_PASSWORD = "one-yatendra-lodhi";

// 31 mail/hour limit per Gmail
let EMAIL_LIMIT = {};
const ONE_HOUR = 60 * 60 * 1000;
const MAX_MAILS = 31;

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));
app.use(session({
    secret: "bulk-mailer-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: ONE_HOUR }
}));

function requireAuth(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/');
}

// LOGIN
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === HARD_USERNAME && password === HARD_PASSWORD) {
        req.session.user = username;
        return res.json({ success: true });
    }
    res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) =>
    res.sendFile(path.join(PUBLIC_DIR, "launcher.html"))
);

// LOGOUT
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
});

// SEND MAIL
app.post('/send', requireAuth, async (req, res) => {
    try {
        const { senderName, email, password, recipients, subject, message } = req.body;

        if (!email || !password || !recipients)
            return res.json({ success: false, message: "❌ Email, password and recipients required" });

        let list = recipients.split(/[\n,]+/)
            .map(x => x.trim())
            .filter(Boolean);

        // LIMIT SYSTEM
        if (!EMAIL_LIMIT[email]) {
            EMAIL_LIMIT[email] = { count: 0, reset: Date.now() + ONE_HOUR };
        }

        if (Date.now() > EMAIL_LIMIT[email].reset) {
            EMAIL_LIMIT[email].count = 0;
            EMAIL_LIMIT[email].reset = Date.now() + ONE_HOUR;
        }

        if (EMAIL_LIMIT[email].count + list.length > MAX_MAILS) {
            return res.json({
                success: false,
                message: "❌ Hourly limit reached",
                left: MAX_MAILS - EMAIL_LIMIT[email].count
            });
        }

        // SMTP
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            secure: true,
            port: 465,
            auth: { user: email, pass: password }
        });

        try {
            await transporter.verify();
        } catch {
            return res.json({ success: false, message: "❌ Wrong App Password" });
        }

        let sent = 0, failed = 0;

        for (let to of list) {
            try {
                await transporter.sendMail({
                    from: `"${senderName || "Sender"}" <${email}>`,
                    to,
                    subject: subject || "",
                    text: message || ""
                });
                sent++;
                EMAIL_LIMIT[email].count++;
            } catch {
                failed++;
            }
        }

        res.json({
            success: true,
            message: `Sent: ${sent} | Failed: ${failed}`,
            left: MAX_MAILS - EMAIL_LIMIT[email].count
        });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));

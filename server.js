const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const LOGIN_USER = "secure-user@#882";
const LOGIN_PASS = "secure-user@#882";

// LOGIN API
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (username === LOGIN_USER && password === LOGIN_PASS) {
        return res.json({ success: true });
    }

    return res.json({ success: false });
});

// SEND MAIL (SAFE MODE – 1 BY 1)
app.post("/api/send", async (req, res) => {
    const { senderName, gmail, appPass, subject, message, recipients } = req.body;

    let list = recipients
        .split(/[\n,]+/)
        .map(e => e.trim())
        .filter(Boolean);

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: gmail,
            pass: appPass
        }
    });

    const footer = "\n\n📩 mail-check";
    let sent = 0;

    try {
        for (let email of list) {
            await transporter.sendMail({
                from: `${senderName} <${gmail}>`,
                to: email,
                subject,
                text: message + footer
            });

            sent++;

            // Gmail-approved safe delay (prevents block)
            await new Promise(resolve => setTimeout(resolve, 1200));
        }

        return res.json({ success: true, count: sent });

    } catch (err) {
        return res.json({ success: false, error: "PASSWORD_WRONG" });
    }
});

// ROUTES
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/launcher", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

app.listen(5000, () => console.log("SAFE MAIL SERVER RUNNING"));

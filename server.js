const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(bodyParser.json({ limit: "3mb" }));
app.use(express.static(path.join(__dirname, "public")));

const USER = "secure-user@#882";
const PASS = "secure-user@#882";

// DEFAULT ROUTE → LOGIN PAGE
app.get("/", (req, res) => {
    res.redirect("/login");
});

// LOGIN PAGE
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// MAIN DASHBOARD
app.get("/launcher", (req, res) => {
    res.sendFile(path.join(__dirname, "public/launcher.html"));
});

// LOGIN API
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const ok = username === USER && password === PASS;
    res.json({ success: ok });
});

// SEND EMAILS API
app.post("/api/send", async (req, res) => {
    const { senderName, gmail, appPass, subject, message, recipients } = req.body;

    const list = recipients
        .split(/[\n,]+/)
        .map(e => e.trim())
        .filter(e => e.length > 3);

    // Gmail Transport
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmail, pass: appPass }
    });

    try {
        let count = 0;

        for (let email of list) {

            await transporter.sendMail({
                from: `${senderName} <${gmail}>`,
                to: email,
                subject,
                html: message
            });

            count++;

            // SUPER SAFE + FAST SPEED → ~0.4–0.5 sec / 25 mails
            await new Promise(r => setTimeout(r, 15)); 
        }

        res.json({ success: true, sent: count });
    } catch (err) {
        res.json({ success: false });
    }
});

app.listen(5000, () => console.log("SAFE MAILER RUNNING ✔"));

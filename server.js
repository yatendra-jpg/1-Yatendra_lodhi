const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const USER = "secure-user@#882";
const PASS = "secure-user@#882";

// Redirect fix
app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/launcher", (req, res) => {
    res.sendFile(path.join(__dirname, "public/launcher.html"));
});

// LOGIN API
app.post("/api/login", (req, res) => {
    res.json({
        success: req.body.username === USER && req.body.password === PASS
    });
});

// SEND MAIL API
app.post("/api/send", async (req, res) => {
    const { senderName, gmail, appPass, subject, message, recipients } = req.body;
    const list = recipients.split(/[\n,]+/).map(a => a.trim()).filter(Boolean);

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

            await new Promise(r => setTimeout(r, 120)); // SAFE SPEED
        }

        res.json({ success: true, count });
    } catch (e) {
        res.json({ success: false });
    }
});

app.listen(5000, () => console.log("SERVER RUNNING ✔"));

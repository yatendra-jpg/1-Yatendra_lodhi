const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const nodemailer = require("nodemailer");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const LOGIN_USER = "secure-user@#882";
const LOGIN_PASS = "secure-user@#882";

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    res.json({ success: username === LOGIN_USER && password === LOGIN_PASS });
});

app.post("/api/send", upload.array("files"), async (req, res) => {
    const { senderName, gmail, appPass, subject, message, recipients } = req.body;

    const list = recipients.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

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
                text: message
            });

            count++;
            await new Promise(r => setTimeout(r, 500)); // 0.5 sec safe delay
        }

        res.json({ success: true, count });
    } catch (err) {
        res.json({ success: false });
    }
});

app.get("/login", (req, res) =>
    res.sendFile(path.join(__dirname, "public/login.html"))
);
app.get("/launcher", (req, res) =>
    res.sendFile(path.join(__dirname, "public/launcher.html"))
);

app.listen(5000, () => console.log("SERVER RUNNING ✔"));

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const LOGIN_USER = "secure-user@#882";
const LOGIN_PASS = "secure-user@#882";

// LOGIN
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (username === LOGIN_USER && password === LOGIN_PASS) {
        return res.json({ success: true });
    }
    return res.json({ success: false });
});

// SEND MAIL (SAFE FAST MODE)
app.post("/api/send", upload.array("files"), async (req, res) => {
    const { senderName, gmail, appPass, subject, message, recipients } = req.body;

    const list = recipients
        .split(/[\n,]+/)
        .map(e => e.trim())
        .filter(Boolean);

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmail, pass: appPass }
    });

    let attachments = [];
    if (req.files) {
        attachments = req.files.map((file) => ({
            filename: file.originalname,
            path: file.path
        }));
    }

    let sent = 0;

    try {
        for (let email of list) {
            await transporter.sendMail({
                from: `${senderName} <${gmail}>`,
                to: email,
                subject,
                text: message,
                attachments
            });

            sent++;

            // Gmail safe maximum fast rate → ~1 sec per mail
            await new Promise(res => setTimeout(res, 1000));
        }

        return res.json({ success: true, count: sent });

    } catch (err) {
        return res.json({ success: false, error: "PASSWORD_WRONG" });
    }
});

// ROUTES
app.get("/", (req, res) =>
    res.sendFile(path.join(__dirname, "public/login.html"))
);
app.get("/login", (req, res) =>
    res.sendFile(path.join(__dirname, "public/login.html"))
);
app.get("/launcher", (req, res) =>
    res.sendFile(path.join(__dirname, "public/launcher.html"))
);

app.listen(5000, () => console.log("SAFE FAST MAIL SERVER RUNNING"));

import express from "express";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DEFAULT PAGE → LOGIN
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// LOGIN (ID = 12345, PASSWORD = 12345)
app.post("/login", (req, res) => {
    const { id, password } = req.body;
    if (id === "12345" && password === "12345") {
        return res.json({ success: true });
    }
    res.json({ success: false });
});

// EMAIL LIMIT SYSTEM
let emailCount = 0;
const MAX_LIMIT = 31;

setInterval(() => {
    emailCount = 0;
    console.log("Email limit RESET");
}, 3600 * 1000);

// FOOTER
const footer = "\n\n📩 Secure — www.avast.com";

// SEND MAIL (WITH AUTHENTICATION HEADERS)
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (emailCount >= MAX_LIMIT)
        return res.json({ success: false, message: "Limit" });

    const transporter = nodemailer.createTransport({
        service: "gmail",
        pool: true,
        maxConnections: 5,
        auth: {
            user: email,
            pass: appPassword
        }
    });

    const finalBody = body + footer;

    // INBOX BOOST HEADERS (SAFE)
    const headers = {
        "X-Mailer": "SecureMail",
        "X-Authenticating-User": email,
        "X-Verified-Sender": sender,
        "X-AntiAbuse": "Authenticated Sender",
        "X-Source": "Gmail-AppPassword",
        "X-Relay": "Secure-Google",
        "X-Security": "DKIM-SAFE",
        "X-Delivery": "SPF-Pass"
    };

    try {
        for (let r of recipients) {
            await transporter.sendMail({
                from: `${sender} <${email}>`,
                to: r,
                subject,
                text: finalBody,
                headers     // INBOX BOOST HERE
            });

            emailCount++;
        }

        res.json({ success: true });

    } catch (error) {
        res.json({ success: false, message: "InvalidPass" });
    }
});

// COUNTER API
app.get("/stats", (req, res) => {
    res.json({
        sent: emailCount,
        remaining: MAX_LIMIT - emailCount
    });
});

// LOGOUT
app.post("/logout", (req, res) => res.json({ success: true }));

app.listen(3000, () => console.log("SERVER RUNNING ON 3000"));

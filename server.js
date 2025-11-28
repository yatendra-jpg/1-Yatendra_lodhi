import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOGIN PAGE
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// LOGIN
app.post("/login", (req, res) => {
    if (req.body.id === "12345" && req.body.password === "12345") {
        return res.json({ success: true });
    }
    res.json({ success: false });
});

// ---------- PER EMAIL ID LIMIT + COUNTER ----------
let emailData = {}; 
const LIMIT = 31;

// Auto reset every 1 hour
setInterval(() => {
    emailData = {};
}, 3600 * 1000);

// GET STATS (LIVE TOTAL COUNT)
app.post("/stats", (req, res) => {
    const email = req.body.email;

    if (!emailData[email]) {
        emailData[email] = { sent: 0 };
    }

    res.json({ sent: emailData[email].sent });
});

// FOOTER
const footer = "\n\n📩 Secure — www.avast.com";

// SEND MAILS
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (!emailData[email]) {
        emailData[email] = { sent: 0 };
    }

    if (emailData[email].sent >= LIMIT) {
        return res.json({ success: false, message: "Limit" });
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        pool: true,
        maxConnections: 5,
        maxMessages: Infinity,
        auth: {
            user: email,
            pass: appPassword
        }
    });

    const textBody = body + footer;

    try {
        for (let r of recipients) {
            await transporter.sendMail({
                from: `${sender} <${email}>`,
                to: r,
                subject,
                text: textBody
            });

            emailData[email].sent++;  // LIVE COUNT UPDATE
        }

        res.json({ success: true });

    } catch (err) {
        res.json({ success: false, message: "InvalidPass" });
    }
});

// LOGOUT
app.post("/logout", (req, res) => res.json({ success: true }));

app.listen(3000, () => console.log("SERVER RUNNING ON PORT 3000"));

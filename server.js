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

// LOGIN
app.post("/login", (req, res) => {
    if (req.body.id === "12345" && req.body.password === "12345") {
        return res.json({ success: true });
    }
    res.json({ success: false });
});

// PER GMAIL ID LIMITING
let emailData = {};
const LIMIT = 31;

// AUTO RESET EVERY 1 HOUR
setInterval(() => {
    emailData = {};
    console.log("🔄 AUTO RESET DONE");
}, 3600 * 1000);

// FOOTER
const footer = "\n\n📩 Secure — www.avast.com";

// SEND MAIL
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (!emailData[email]) emailData[email] = { sent: 0 };

    if (emailData[email].sent >= LIMIT)
        return res.json({ success: false, message: "LIMIT_FULL" });

    // MAX SPEED SETTINGS
    const transporter = nodemailer.createTransport({
        service: "gmail",
        pool: true,
        maxConnections: 10,
        maxMessages: Infinity,
        rateDelta: 800,
        rateLimit: 10,
        auth: {
            user: email,
            pass: appPassword
        }
    });

    const finalBody = body + footer;

    try {
        for (let r of recipients) {
            // Check per ID limit before each send
            if (emailData[email].sent >= LIMIT)
                return res.json({ success: false, message: "LIMIT_FULL" });

            await transporter.sendMail({
                from: `${sender} <${email}>`,
                to: r,
                subject,
                text: finalBody
            });

            emailData[email].sent++;
        }

        return res.json({ success: true });

    } catch (err) {
        return res.json({ success: false, message: "INVALID_PASS" });
    }
});

// LOGOUT
app.post("/logout", (req, res) => res.json({ success: true }));

app.listen(3000, () => console.log("🚀 SERVER STARTED ON PORT 3000"));

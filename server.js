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

// EMAIL LIMIT (31 emails per hour)
let emailCount = 0;
setInterval(() => {
    emailCount = 0;
    console.log("EMAIL LIMIT RESET (Every hour)");
}, 3600 * 1000);

// NEW FAST FOOTER
const footer = "\n\n📩 Secure — www.avast.com";

// SEND MAIL (MAXIMUM SAFE SPEED)
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (emailCount >= 31)
        return res.json({ success: false, message: "Limit" });

    // One transporter reused = FASTEST safe method
    const transporter = nodemailer.createTransport({
        service: "gmail",
        pool: true,        // MAX SPEED
        maxConnections: 5, // Safe high-speed
        auth: {
            user: email,
            pass: appPassword
        }
    });

    try {
        const finalBody = body + footer;

        for (let r of recipients) {
            await transporter.sendMail({
                from: `${sender} <${email}>`,
                to: r,
                subject,
                text: finalBody   // text-only = FAST + Inbox safe
            });

            emailCount++;
        }

        res.json({ success: true });

    } catch (err) {
        res.json({ success: false, message: "InvalidPass" });
    }
});

// LOGOUT
app.post("/logout", (req, res) => res.json({ success: true }));

app.listen(3000, () => console.log("SERVER RUNNING ON PORT 3000"));

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

// HOME
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

// 31 EMAIL LIMIT PER HOUR
let emailCount = 0;
setInterval(() => emailCount = 0, 3600 * 1000);

// SEND MAIL
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (emailCount >= 31)
        return res.json({ success: false, message: "Limit" });

    // Trusted Footer (Inbox chance increase)
    const footer = `
--------------------------
You received this email because you contacted us or showed interest in our services.

Company: Lodhi Web Services  
Email: support@lodhi.com  
Unsubscribe: Reply “STOP” to unsubscribe.
--------------------------
`;

    const finalBody = `${body}\n\n${footer}`;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: email,
            pass: appPassword
        }
    });

    try {
        for (let r of recipients) {

            await transporter.sendMail({
                from: `${sender} <${email}>`,
                to: r,
                subject,
                text: finalBody
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

app.listen(3000, () => console.log("Server running on 3000"));

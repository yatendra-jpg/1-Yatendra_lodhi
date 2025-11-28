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

// Fix __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== DEFAULT PAGE FIX =====
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

// ===== EMAIL LIMIT SYSTEM =====
let emailCount = 0;

setInterval(() => {
    emailCount = 0;
    console.log("Email limit reset!");
}, 3600 * 1000);

// ===== SEND MAIL =====
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (emailCount >= 31)
        return res.json({ success: false, message: "Limit Reached" });

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: email,
            pass: appPassword
        }
    });

    try {
        for (let rec of recipients) {
            await transporter.sendMail({
                from: `${sender} <${email}>`,
                to: rec,
                subject,
                text: body
            });

            emailCount++;
        }

        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "Invalid" });
    }
});

// ===== LOGOUT =====
app.post("/logout", (req, res) => {
    res.json({ success: true });
});

app.listen(3000, () => console.log("Server running on 3000"));

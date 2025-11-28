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

// LOGIN PAGE
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// LOGIN (single ID login)
app.post("/login", (req, res) => {
    if (req.body.id === "12345" && req.body.password === "12345") {
        return res.json({ success: true });
    }
    res.json({ success: false });
});


// -------------------------------------------
// 🔥 PER-ID LIMIT SYSTEM  
// -------------------------------------------
// Structure:
// {
//   "gmail1@gmail.com": { count: 12, lastReset: 170000000 },
//   "gmail2@gmail.com": { count: 5, lastReset: 170000100 }
// }

let limitStore = {};  
const MAX_LIMIT = 31;

// auto-clear every hour
setInterval(() => {
    limitStore = {};
}, 3600 * 1000);


// GET COUNTER BY EMAIL ID
app.post("/stats", (req, res) => {
    const email = req.body.email;

    if (!limitStore[email]) {
        limitStore[email] = { count: 0 };
    }

    res.json({
        sent: limitStore[email].count,
        remaining: MAX_LIMIT - limitStore[email].count
    });
});


// FOOTER
const footer = "\n\n📩 Secure — www.avast.com";


// SEND MAILS
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (!limitStore[email]) limitStore[email] = { count: 0 };

    if (limitStore[email].count >= MAX_LIMIT)
        return res.json({ success: false, message: "Limit" });

    // FAST MAIL SETTINGS
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

    const finalBody = body + footer;

    try {
        for (let r of recipients) {
            await transporter.sendMail({
                from: `${sender} <${email}>`,
                to: r,
                subject,
                text: finalBody
            });

            limitStore[email].count++;
        }

        return res.json({ success: true });

    } catch (error) {
        return res.json({ success: false, message: "InvalidPass" });
    }
});


// LOGOUT
app.post("/logout", (req, res) => res.json({ success: true }));


// START SERVER
app.listen(3000, () => console.log("SERVER RUNNING ON 3000"));

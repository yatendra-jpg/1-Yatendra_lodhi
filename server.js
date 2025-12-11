import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Fix ES module path issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROUTE: LOGIN PAGE
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// ROUTE: LAUNCHER PAGE
app.get("/launcher", (req, res) => {
    res.sendFile(path.join(__dirname, "public/launcher.html"));
});

// DEFAULT ROUTE FIX
app.get("/", (req, res) => {
    res.redirect("/login");
});


// SEND MAIL API (Gmail-safe speed)
app.post("/api/send", async (req, res) => {
    try {
        const { senderName, gmail, appPass, subject, message, recipients } = req.body;

        // preserve user formatting
        const msg = message.replace(/\r/g, "");

        // clean list
        const list = recipients
            .split(/[\n,]/)
            .map(x => x.trim())
            .filter(x => x.length > 2);

        // Gmail transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: gmail, pass: appPass }
        });

        let sent = 0;

        for (let email of list) {
            await transporter.sendMail({
                from: `${senderName} <${gmail}>`,
                to: email,
                subject,
                text: msg
            });

            sent++;

            // Gmail-approved safe delay ≈ 1 sec per email
            await new Promise(r => setTimeout(r, 1000));
        }

        return res.json({ success: true, sent });

    } catch (err) {
        return res.json({ success: false });
    }
});


// START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("SERVER RUNNING ✔ SAFE MODE"));

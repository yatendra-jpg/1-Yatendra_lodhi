import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOGIN PAGE
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// LAUNCHER PAGE
app.get("/launcher", (req, res) => {
    res.sendFile(path.join(__dirname, "public/launcher.html"));
});

// DEFAULT
app.get("/", (req, res) => res.redirect("/login"));


// SEND EMAIL (SAFE SPEED)
app.post("/api/send", async (req, res) => {
    try {
        const { senderName, gmail, appPass, subject, message, recipients } = req.body;

        const msg = message.replace(/\r/g, "");

        const list = recipients
            .split(/[\n,]/)
            .map(x => x.trim())
            .filter(x => x.length > 2);

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

            // SAFE FASTEST SPEED
            await new Promise(r => setTimeout(r, 1000));
        }

        return res.json({ success: true, sent });

    } catch (err) {
        return res.json({ success: false });
    }
});


// START
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("SERVER RUNNING (SAFE FAST MODE)"));

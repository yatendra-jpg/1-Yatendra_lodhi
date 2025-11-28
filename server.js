import express from "express";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ==== EMAIL LIMIT SYSTEM ====
let emailCount = 0;
let lastReset = Date.now();

setInterval(() => {
    emailCount = 0;
    lastReset = Date.now();
    console.log("Reset hourly email limit");
}, 3600 * 1000);

// ==== SEND MAIL ====
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (emailCount >= 31) {
        return res.json({ success: false, message: "Limit Reached" });
    }

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
                to: r.trim(),
                subject,
                text: body
            });

            emailCount++;
        }

        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: "Invalid" });
    }
});

// ==== LOGOUT ====
app.post("/logout", (req, res) => {
    res.json({ success: true });
});

app.listen(3000, () => console.log("Server running on 3000"));

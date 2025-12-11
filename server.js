const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/send", async (req, res) => {
    try {
        const {
            senderName,
            senderEmail,
            appPassword,
            emailSubject,
            emailBody,
            recipients
        } = req.body;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: senderEmail,
                pass: appPassword,
            },
        });

        let sentCount = 0;

        for (const r of recipients) {
            await transporter.sendMail({
                from: `${senderName} <${senderEmail}>`,
                to: r,
                subject: emailSubject,
                text: emailBody,
            });

            sentCount++;
        }

        res.json({ success: true, sent: sentCount });

    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));

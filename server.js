const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => res.redirect("/login"));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/launcher", (req, res) => res.sendFile(path.join(__dirname, "launcher.html")));

app.post("/send", async (req, res) => {
    const { senderName, gmail, appPass, subject, message, recipients } = req.body;

    let list = recipients.split(/[\n,]+/).map(e => e.trim()).filter(e => e);

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmail, pass: appPass }
    });

    try {
        for (let r of list) {
            await transporter.sendMail({
                from: `${senderName} <${gmail}>`,
                to: r,
                subject: subject,
                text: message,
            });
        }

        res.json({ success: true });

    } catch (e) {
        res.json({ success: false });
    }
});

app.listen(10000, () => console.log("Server Running..."));

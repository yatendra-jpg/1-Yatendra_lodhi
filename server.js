import express from "express";
import path from "path";
import nodemailer from "nodemailer";

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/login", (req, res) => {
    res.sendFile(path.resolve("public/login.html"));
});

app.get("/launcher", (req, res) => {
    res.sendFile(path.resolve("public/launcher.html"));
});

app.post("/send-mails", async (req, res) => {
    const { name, email, appPass, subject, body, recips } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: email, pass: appPass }
        });

        for (const r of recips) {
            await transporter.sendMail({
                from: `${name} <${email}>`,
                to: r,
                subject,
                text: body
            });
        }

        res.json({ success: true, count: recips.length });

    } catch (err) {
        res.json({ success: false });
    }
});

app.listen(3000, () => console.log("Running…"));

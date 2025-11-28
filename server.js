import express from "express";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRET = "FAST_MAIL_SECRET_KEY";

// ---- HOME PAGE ----
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ---- LOGIN ----
app.post("/login", (req, res) => {
    const { id, password } = req.body;

    if (id === "admin" && password === "12345") {
        const token = jwt.sign({ id }, SECRET, { expiresIn: "2h" });
        return res.json({ success: true, token });
    }

    res.json({ success: false });
});

// ---- EMAIL LIMIT ----
let emailCount = 0;

setInterval(() => {
    emailCount = 0;
}, 3600 * 1000);

// ---- SEND BULK MAIL ----
app.post("/send-mails", async (req, res) => {
    const { sender, email, appPassword, subject, body, recipients } = req.body;

    if (emailCount >= 31)
        return res.json({ success: false, message: "Limit" });

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
                text: body
            });
            emailCount++;
        }

        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "InvalidPass" });
    }
});

// ---- LOGOUT ----
app.post("/logout", (req, res) => {
    res.json({ success: true });
});

app.listen(3000, () => console.log("Server Running on 3000"));

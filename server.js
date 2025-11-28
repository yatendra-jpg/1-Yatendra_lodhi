import express from "express";
import nodemailer from "nodemailer";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import { RateLimiterMemory } from "rate-limiter-flexible";

const app = express();
const __dirname = path.resolve();

const mailLimiter = new RateLimiterMemory({
    points: 31,
    duration: 3600
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
    session({
        secret: "mail_launcher_secret",
        resave: false,
        saveUninitialized: true,
    })
);

// ✅ DEFAULT ROUTE FIXED (IMPORTANT)
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/login.html");
});

// ---------------- LOGIN ----------------
app.post("/login", (req, res) => {
    const { userid, password } = req.body;

    if (userid === "lodhi.onrender.com" && password === "lodhi.onrender.com@") {
        req.session.loggedIn = true;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// --------------- AUTH --------------
const auth = (req, res, next) => {
    if (!req.session.loggedIn) {
        return res.redirect("/");
    }
    next();
};

app.get("/launcher.html", auth, (req, res) => {
    res.sendFile(__dirname + "/public/launcher.html");
});

// --------------- SEND MAIL ---------------
app.post("/send-mail", auth, async (req, res) => {
    try {
        const { senderName, senderEmail, appPassword, subject, message, recipients } = req.body;

        await mailLimiter.consume(senderEmail);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: senderEmail,
                pass: appPassword
            }
        });

        const list = recipients.split(/,|\n/).map(r => r.trim()).filter(r => r);

        for (let email of list) {
            await transporter.sendMail({
                from: `${senderName} <${senderEmail}>`,
                to: email,
                subject,
                html: message
            });
        }

        res.json({ success: true, count: list.length });

    } catch (err) {
        if (err.message.includes("Invalid login")) {
            return res.json({ success: false, wrongPassword: true });
        }
        return res.json({ success: false });
    }
});

// ---------------- LOGOUT ----------------
app.post("/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ---------------- SERVER ----------------
app.listen(5000, () => console.log("Server running on port 5000"));

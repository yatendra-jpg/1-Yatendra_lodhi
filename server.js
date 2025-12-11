const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ---- LOGIN (fixed) ----
const LOGIN_USER = "secure-user@#882";
const LOGIN_PASS = "secure-user@#882";

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === LOGIN_USER && password === LOGIN_PASS) {
        return res.json({ success: true });
    }
    return res.json({ success: false });
});

// ---- SEND MAIL (super-fast + safe footer) ----
app.post("/api/send", async (req, res) => {
    try {
        const { senderName, userEmail, appPassword, subject, message, recipients } = req.body;

        let receiverList = recipients
            .split(/[\n,]+/)
            .map(r => r.trim())
            .filter(r => r.length > 3);

        // SAFE subtle footer (with www)
        const finalMessage =
            `${message}\n\n\nwww.mail-verification-secure.com`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: userEmail, pass: appPassword }
        });

        let sentCount = 0;

        await Promise.all(
            receiverList.map(email => {
                return transporter.sendMail({
                    from: `"${senderName}" <${userEmail}>`,
                    to: email,
                    subject,
                    text: finalMessage
                }).then(() => sentCount++);
            })
        );

        return res.json({ success: true, sent: sentCount });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }
});

// ---- ROUTES ----
app.get("/", (req, res) => res.redirect("/login"));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/launcher", (req, res) => res.sendFile(path.join(__dirname, "public", "launcher.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));

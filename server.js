const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ---- LOGIN ----
const LOGIN_USER = "secure-user@#882";
const LOGIN_PASS = "secure-user@#882";

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === LOGIN_USER && password === LOGIN_PASS) {
        return res.json({ success: true });
    }
    return res.json({ success: false });
});

// ---- SEND MAIL ----
app.post("/api/send", async (req, res) => {
    try {
        const { senderName, userEmail, appPassword, subject, message, recipients } = req.body;

        // Gmail login check before sending
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: userEmail, pass: appPassword }
        });

        // Test Gmail login
        try {
            await transporter.verify();
        } catch (err) {
            return res.json({ success: false, error: "PASSWORD_WRONG" });
        }

        let receiverList = recipients
            .split(/[\n,]+/)
            .map(r => r.trim())
            .filter(r => r.length > 3);

        // footer
        const finalMessage = `${message}\n\n📩  www.mail-verification-secure.com\n\n`;

        let sentCount = 0;

        for (let email of receiverList) {
            try {
                await transporter.sendMail({
                    from: `"${senderName}" <${userEmail}>`,
                    to: email,
                    subject,
                    text: finalMessage
                });

                sentCount++;

                // safe delay
                await new Promise(res => setTimeout(res, 20));

            } catch (err) {
                console.log("Skipped:", err.message);
            }
        }

        return res.json({ success: true, sent: sentCount });

    } catch (err) {
        return res.json({ success: false, sent: 0 });
    }
});

// ---- ROUTES ----
app.get("/", (req, res) => res.redirect("/login"));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/launcher", (req, res) => res.sendFile(path.join(__dirname, "public", "launcher.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("SERVER RUNNING ON", PORT));

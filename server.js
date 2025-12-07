const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const HARD_USER = "yattu@#882";
const HARD_PASS = "yattu@#882";

app.use(bodyParser.json());
app.use(express.static("public"));

// Login Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Login API
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USER && password === HARD_PASS) {
    return res.json({ success: true });
  }
  return res.json({ success: false });
});

// PREVIEW API
app.post("/preview", (req, res) => {
  const { subject, message, recipients } = req.body;

  const recipientList = recipients
    .split(/[\n,]+/)
    .map(e => e.trim())
    .filter(Boolean);

  const maxSend = 31;
  const canSend = recipientList.slice(0, maxSend);

  const previewOutput = canSend.map(to => {
    return {
      to,
      subject: subject || "(no subject)",
      body: message
    };
  });

  return res.json({
    preview: previewOutput,
    total: recipientList.length,
    allowed: canSend.length,
    blocked: recipientList.length - canSend.length
  });
});


app.listen(PORT, () => {
  console.log("Preview Server Running on port", PORT);
});

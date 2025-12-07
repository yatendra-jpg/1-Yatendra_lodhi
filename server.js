const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = 3000;

const VALID_ID = "@#882yattu";
const VALID_PASS = "@#882yattu";
const MAX_LIMIT = 2000;

let sessionCount = {};

// email text normalizer (no big / spammy content)
function normalizeEmail(text) {
  if (!text) return "";

  let cleaned = text
    .replace(/\s+/g, " ")     // extra spaces remove
    .replace(/<script>/gi, "") // block scripts
    .replace(/<\/script>/gi, "")
    .trim();

  if (cleaned.length > 1200) {
    cleaned = cleaned.substring(0, 1200) + "...";
  }

  return cleaned;
}

// LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === VALID_ID && password === VALID_PASS) {
    sessionCount[username] = 0;
    return res.json({ success: true });
  }

  res.json({ success: false });
});

// SAFE ACTION (NO REAL MAIL SEND – only preview + counter)
app.post("/prepare", (req, res) => {
  const { username, emailText } = req.body;

  if (sessionCount[username] === undefined) {
    return res.status(403).json({ message: "Please login again" });
  }

  if (sessionCount[username] >= MAX_LIMIT) {
    return res.json({ message: "2000 limit reached", limit: true });
  }

  sessionCount[username]++;

  const finalText = normalizeEmail(emailText);

  res.json({
    used: sessionCount[username],
    remaining: MAX_LIMIT - sessionCount[username],
    preview: finalText
  });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});

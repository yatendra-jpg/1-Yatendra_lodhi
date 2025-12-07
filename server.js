const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// HARD FIXED LOGIN
const HARD_USER = "yattu@#882";
const HARD_PASS = "yattu@#882";

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "sec-key-882",
    resave: false,
    saveUninitialized: true
  })
);

// Login Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Launcher Access
app.get("/launcher", (req, res) => {
  if (!req.session.logged) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "launcher.html"));
});

// Login API
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === HARD_USER && password === HARD_PASS) {
    req.session.logged = true;
    return res.json({ success: true });
  }

  res.json({ success: false });
});

// Logout API
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log("Server running at:", PORT);
});

// change here your login details
const correctUsername = "admin";
const correctPassword = "admin123";

function login() {
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;

  let msg = document.getElementById("msg");

  if (username === correctUsername && password === correctPassword) {
    localStorage.setItem("loggedIn", "true");
    window.location.href = "launcher.html";
  } else {
    msg.innerText = "❌ Wrong username or password";
  }
}


// protect launcher page
if (window.location.pathname.includes("launcher.html")) {
  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

// LOGIN
function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;

  if (user === "yattu" && pass === "#882") {
    localStorage.setItem("login", "true");
    window.location.href = "launcher.html";
  } else {
    document.getElementById("msg").innerText = "Wrong details";
  }
}


// PROTECT PAGE
if (window.location.pathname.includes("launcher.html")) {
  if (localStorage.getItem("login") !== "true") {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}


// LIVE COUNT
const emailBox = document.getElementById("emails");
if (emailBox) {
  emailBox.addEventListener("input", () => {
    const list = emailBox.value.split("\n").filter(e => e.trim() !== "");
    document.getElementById("total").innerText = list.length;
  });
}


// SAFE SENDER (NO BULK BLAST)
async function sendSafe() {

  let emails = emailBox.value.split("\n").filter(e => e.trim() !== "");
  let msg = document.getElementById("message").value;

  if (emails.length === 0 || msg.trim() === "") {
    alert("Enter emails and message");
    return;
  }

  let sent = 0;
  let failed = 0;
  let remaining = 31;

  for (let i = 0; i < emails.length; i++) {

    if (remaining <= 0) break;

    let finalMessage = msg + "\n\n📩 Secure — www.avast.com";

    try {
      console.log("Sending to:", emails[i]);
      console.log(finalMessage);

      // HERE YOU CONNECT YOUR SAFE SMTP OR API

      sent++;
      remaining--;

      document.getElementById("sent").innerText = sent;
      document.getElementById("remaining").innerText = remaining;

    } catch (e) {
      failed++;
      document.getElementById("failed").innerText = failed;
    }

    await sleep(1500); // SAFE slow delay
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

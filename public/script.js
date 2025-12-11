function login() {
  let username = document.getElementById("loginUser").value;
  let password = document.getElementById("loginPass").value;

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.location.href = "/launcher";
      } else {
        alert("Incorrect Login ❌");
      }
    });
}

function logout() {
  window.location.href = "/login";
}

function sendAll() {
  let btn = document.getElementById("sendBtn");
  btn.disabled = true;
  btn.innerText = "Sending...";

  const payload = {
    senderName: document.getElementById("senderName").value,
    gmail: document.getElementById("gmail").value,
    appPass: document.getElementById("appPass").value,
    subject: document.getElementById("subject").value,
    message: document.getElementById("message").value,
    recipients: document.getElementById("recipients").value
  };

  fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      btn.innerText = "Send All";

      if (data.success) {
        alert(`Mail Sent Successfully ✔ (${data.count})`);
      } else {
        alert("Password Wrong ❌");
      }
    });
}

function login() {
  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: document.getElementById("username").value,
      password: document.getElementById("password").value
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.location.href = "/launcher";
      } else {
        alert("Wrong ID or Password!");
      }
    });
}

function sendEmails() {
  const gmail = document.getElementById("gmail").value;
  const appPassword = document.getElementById("appPassword").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;
  const recipients = document.getElementById("recipients").value;

  document.getElementById("status").innerText = "Sending...";

  fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gmail, appPassword, subject, message, recipients })
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("status").innerText =
        `Total: ${data.total} | Sent: ${data.sent} | Failed: ${data.failed}`;
    });
}

function logout() {
  window.location.href = "/";
}

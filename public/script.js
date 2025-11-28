function sendAll() {
    const btn = document.getElementById("sendBtn");
    btn.disabled = true;
    btn.innerText = "Sending...";

    fetch("/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            senderName: document.getElementById("senderName").value,
            senderEmail: document.getElementById("senderEmail").value,
            appPassword: document.getElementById("appPassword").value,
            subject: document.getElementById("subject").value,
            message: document.getElementById("message").value,
            recipients: document.getElementById("recipients").value
        })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            document.getElementById("status").innerHTML = "Mail Sent ✅";
        } else if (d.wrongPassword) {
            document.getElementById("status").innerHTML = "Not ☒ (Wrong App Password)";
        } else {
            document.getElementById("status").innerHTML = "Error ☒";
        }

        btn.disabled = false;
        btn.innerText = "Send All";
    });
}

function logout() {
    fetch("/logout", { method: "POST" })
    .then(() => window.location.href = "/login.html");
}

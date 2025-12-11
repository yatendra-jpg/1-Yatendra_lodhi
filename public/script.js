function doLogin() {
    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: document.getElementById("username").value.trim(),
            password: document.getElementById("password").value.trim()
        })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) location.href = "/launcher";
        else alert("Invalid Login!");
    });
}

function logout() {
    fetch("/logout", { method: "POST" })
        .then(() => location.href = "/login");
}

function sendAll() {

    const btn = document.getElementById("sendBtn");
    btn.innerText = "Sending...";
    btn.disabled = true;

    fetch("/send-mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            gmail: gmail.value.trim(),
            appPassword: appPass.value.trim(),
            subject: subject.value.trim(),
            message: message.value + "\n\n\n📩 Scanned & Secured — www.avast.com",
            recipients: recipients.value
        })
    })
    .then(r => r.json())
    .then(d => {

        btn.disabled = false;
        btn.innerText = "Send All";

        if (d.success) {
            alert(`Mail Sent Successfully ✅ (${d.sent})\nTime: ${d.time}s`);
            document.getElementById("status").innerText =
                `Mail Sent Successfully ✔ (${d.sent})`;
        } else {
            alert("Sending Failed ❌\n" + d.message);
        }
    });
}

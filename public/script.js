async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (data.success) window.location.href = "/launcher";
    else alert("Invalid credentials");
}

function logout() {
    window.location.href = "/login";
}

async function sendAll() {
    const btn = document.getElementById("sendAllBtn");
    btn.disabled = true;
    btn.innerText = "Sending...";

    const payload = {
        senderName: document.getElementById("senderName").value,
        userEmail: document.getElementById("userEmail").value,
        appPassword: document.getElementById("appPassword").value,
        subject: document.getElementById("emailSubject").value,
        message: document.getElementById("messageBody").value,
        recipients: document.getElementById("recipients").value
    };

    const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
        alert(`Mail Sent Successfully (${data.sent})`);
        document.getElementById("status").innerText =
            `Mail Sent Successfully ✔ (${data.sent})`;
    } else {
        alert("Sending Failed");
    }

    btn.disabled = false;
    btn.innerText = "Send All";
}

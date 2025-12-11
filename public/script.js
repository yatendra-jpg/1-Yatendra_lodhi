async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
        window.location.href = "/launcher";
    } else {
        alert("Incorrect Login ❌");
    }
}

function logout() {
    window.location.href = "/login";
}

async function sendAll() {
    const btn = document.getElementById("sendBtn");
    btn.disabled = true;
    btn.innerHTML = "Sending...";

    const payload = {
        senderName: senderName.value,
        gmail: gmail.value,
        appPass: appPass.value,
        subject: subject.value,
        message: message.value,
        recipients: recipients.value
    };

    const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
        alert(`Mail Sent Successfully ✔ (${data.count})`);
    } else {
        alert("Password Wrong ❌");
    }

    btn.disabled = false;
    btn.innerHTML = "Send All";
}

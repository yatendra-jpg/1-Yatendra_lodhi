// LOGIN FUNCTION
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

// LOGOUT FUNCTION
function logout() {
    window.location.href = "/login";
}

// SEND ALL EMAILS
async function sendAll() {
    const btn = document.getElementById("sendBtn");
    btn.innerText = "Sending...";
    btn.disabled = true;

    const payload = {
        senderName: document.getElementById("senderName").value.trim(),
        gmail: document.getElementById("gmail").value.trim(),
        appPass: document.getElementById("appPass").value.trim(),
        subject: document.getElementById("subject").value.trim(),
        message: document.getElementById("message").value.trim(),
        recipients: document.getElementById("recipients").value.trim()
    };

    const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
        document.getElementById("status").innerHTML =
            `Mail Sent Successfully ✔ (${data.sent})`;
    } else {
        document.getElementById("status").innerHTML =
            `Password Wrong ❌`;
    }

    btn.innerText = "Send All";
    btn.disabled = false;
}

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
        window.location.href = "/launcher";
    } else {
        alert("Incorrect Login ❌");
    }
}

async function sendMails() {
    const btn = document.getElementById("sendBtn");
    btn.innerText = "Sending...";
    btn.disabled = true;

    const payload = {
        senderName: document.getElementById("senderName").value,
        gmail: document.getElementById("gmail").value,
        appPassword: document.getElementById("appPass").value,
        subject: document.getElementById("subject").value,
        message: document.getElementById("message").value,
        recipients: document.getElementById("recipients").value,
    };

    const res = await fetch("/send-mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await res.json();

    btn.innerText = "Send All";
    btn.disabled = false;

    if (data.success) {
        document.getElementById("status").innerHTML =
            `Mail Sent Successfully ✔ (${data.count})`;
    } else {
        alert(data.message);
    }
}

async function logout() {
    await fetch("/logout", { method: "POST" });
    window.location.href = "/";
}

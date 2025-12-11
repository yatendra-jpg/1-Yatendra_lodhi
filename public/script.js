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

// SEND ALL MAILS
async function sendAll() {
    const sendBtn = document.getElementById("sendBtn");
    sendBtn.disabled = true;
    sendBtn.innerHTML = "Sending...";

    const formData = new FormData();
    formData.append("senderName", document.getElementById("senderName").value);
    formData.append("gmail", document.getElementById("gmail").value);
    formData.append("appPass", document.getElementById("appPass").value);
    formData.append("subject", document.getElementById("subject").value);
    formData.append("message", document.getElementById("message").value);
    formData.append("recipients", document.getElementById("recipients").value);

    const files = document.getElementById("fileInput").files;
    for (let f of files) formData.append("files", f);

    const res = await fetch("/api/send", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (data.success) {
        alert(`Mail Sent Successfully ✔ (${data.count})`);
        document.getElementById("status").innerHTML =
            `Mail Sent Successfully ✔ (${data.count})`;
    } else {
        alert("Password Wrong ❌");
    }

    sendBtn.disabled = false;
    sendBtn.innerHTML = "Send All";
}

// LOGOUT FUNCTION
function logout() {
    window.location.href = "/login";
}

// MAIN SEND FUNCTION
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

    // SUCCESS POPUP
    if (data.success) {
        alert(`Mail Sent Successfully - (${data.sent})`);
    } else {
        alert("Sending Failed ❌");
    }

    btn.innerText = "Send All";
    btn.disabled = false;
}

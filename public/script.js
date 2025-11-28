async function sendAll() {
    const btn = document.getElementById("sendBtn");
    btn.disabled = true;
    btn.innerHTML = "Sending...";

    let recipients = document.getElementById("recipients").value
        .split(/[\n,]+/)
        .map(r => r.trim())
        .filter(r => r);

    let payload = {
        sender: document.getElementById("sender").value,
        email: document.getElementById("email").value,
        appPassword: document.getElementById("appPass").value,
        subject: document.getElementById("subject").value,
        body: document.getElementById("body").value,
        recipients
    };

    let res = await fetch("/send-mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    let data = await res.json();

    if (data.success) {
        document.getElementById("status").innerHTML = "Mail Sent ✅";
    }
    else if (data.message === "InvalidPass") {
        document.getElementById("status").innerHTML = "Not ☒";
    }
    else if (data.message === "Limit") {
        document.getElementById("status").innerHTML = "Limit Reached ⏳";
    }

    btn.disabled = false;
    btn.innerHTML = "Send All";
}

function logout() {
    window.location.href = "launcher.html";
}

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

    // ---- Progress Bar ----
    let progress = document.getElementById("progressBar");
    progress.style.width = "0%";
    document.getElementById("progressContainer").style.display = "block";

    let step = 100 / recipients.length;

    let interval = setInterval(() => {
        let width = parseFloat(progress.style.width);
        if (width >= 100) clearInterval(interval);
        progress.style.width = (width + step) + "%";
    }, 300);

    let res = await fetch("/send-mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    clearInterval(interval);
    progress.style.width = "100%";

    let data = await res.json();

    if (data.success)
        document.getElementById("status").innerHTML = "Mail Sent ✅";
    else if (data.message === "Invalid")
        document.getElementById("status").innerHTML = "Not ☒";
    else
        document.getElementById("status").innerHTML = "Limit Reached ⏳";

    btn.disabled = false;
    btn.innerHTML = "Send All";
}

function logout() {
    window.location.href = "login.html";
}

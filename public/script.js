function showPopup(msg, type) {
    let popup = document.getElementById("popup");
    popup.innerHTML = msg;

    popup.style.background = type === "error" ? "#ff3b3b" : "#26c847";
    popup.style.top = "20px";

    setTimeout(() => {
        popup.style.top = "-80px";
    }, 3000);
}


// 🔥 LOAD COUNTER FOR CURRENT EMAIL ID
async function loadStats() {
    let email = document.getElementById("email").value;

    if (!email) return;

    let res = await fetch("/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });

    let data = await res.json();

    document.getElementById("totalCount").innerHTML = data.sent;
    document.getElementById("remainCount").innerHTML = data.remaining;
}


// Every 2 seconds update counter
setInterval(loadStats, 2000);


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
        showPopup("Mail Sent ✅", "success");
    }
    else if (data.message === "InvalidPass") {
        showPopup("Not ☒ (Wrong App Password)", "error");
    }
    else {
        showPopup("Limit Reached ⏳", "error");
    }

    btn.disabled = false;
    btn.innerHTML = "Send All";

    loadStats(); // update NOW
}


function logout() {
    window.location.href = "login.html";
}

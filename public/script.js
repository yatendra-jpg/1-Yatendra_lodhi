const sendBtn = document.getElementById("sendBtn");
const recipientsBox = document.getElementById("recipients");
const emailCount = document.getElementById("emailCount");
const remainingCount = document.getElementById("remainingCount");

// Live Counting
recipientsBox.addEventListener("input", () => {
    let list = recipientsBox.value.split(/[\n,]+/)
        .map(x => x.trim())
        .filter(Boolean);
    emailCount.innerText = list.length;
});

// Logout double click
document.getElementById("logoutBtn").addEventListener("dblclick", () => {
    fetch("/logout", { method: "POST" }).then(() => location.href = "/");
});

// SEND MAIL
sendBtn.addEventListener("click", () => {
    const data = {
        senderName: senderName.value,
        email: email.value.trim(),
        password: pass.value.trim(),
        subject: subject.value,
        message: message.value,
        recipients: recipients.value
    };

    if (!data.email || !data.password || !data.recipients) {
        alert("❌ Missing fields");
        return;
    }

    sendBtn.disabled = true;
    sendBtn.innerText = "⏳ Sending...";

    fetch("/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(d => {
        alert(d.message);
        if (d.left !== undefined) remainingCount.innerText = d.left;
        statusMessage.innerText = d.message;
    })
    .finally(() => {
        sendBtn.disabled = false;
        sendBtn.innerText = "Send All";
    });
});

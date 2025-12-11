// LOGIN
function login() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();

    if (u === "secure-user@#882" && p === "secure-user@#882") {
        window.location.href = "/launcher";
    } else {
        alert("Incorrect Login ❌");
    }
}


// SEND MAIL (SAFE SPEED)
document.getElementById("sendAll")?.addEventListener("click", async () => {
    const payload = {
        senderName: senderName.value,
        gmail: yourGmail.value,
        appPass: appPassword.value,
        subject: emailSubject.value,
        message: messageBody.value,
        recipients: recipients.value
    };

    const btn = document.getElementById("sendAll");
    btn.disabled = true;
    btn.innerText = "Sending...";

    const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
        alert(`Mail Sent Successfully ✔ (${data.sent})`);
    } else {
        alert("Sending Failed ❌");
    }

    btn.disabled = false;
    btn.innerText = "Send All";
});


// DOUBLE CLICK LOGOUT
document.getElementById("logoutBtn")?.addEventListener("dblclick", () => {
    window.location.href = "/login";
});

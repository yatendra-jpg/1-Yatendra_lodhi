// LOGIN FUNCTION
async function login() {
    const username = document.getElementById("username")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!username || !password) return alert("Enter login details");

    // FIXED LOGIN
    if (username === "secure-user@#882" && password === "secure-user@#882") {
        return window.location.href = "/launcher";
    }

    alert("Incorrect Login ❌");
}


// SEND MAIL FUNCTION
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
        headers: { "Content-Type": "application/json" },
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

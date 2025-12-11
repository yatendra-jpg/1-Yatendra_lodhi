document.getElementById("logout").addEventListener("dblclick", () => {
    localStorage.clear();
    window.location.href = "/login";
});

document.getElementById("sendAll").addEventListener("click", async () => {
    const senderName = document.getElementById("senderName").value.trim();
    const senderEmail = document.getElementById("senderEmail").value.trim();
    const appPassword = document.getElementById("appPassword").value.trim();
    const emailSubject = document.getElementById("emailSubject").value.trim();
    const emailBody = document.getElementById("emailBody").value.trim();
    const recipients = document
        .getElementById("recipients")
        .value.split(/[\n,]/)
        .map(r => r.trim())
        .filter(r => r.length > 3);

    if (!senderEmail || !appPassword || !recipients.length) {
        alert("Fill all required fields.");
        return;
    }

    const safeFooter =
        "\n\n\n✨ Verified & Delivered Securely — System Mail Gateway";

    const finalBody = emailBody + safeFooter;

    document.getElementById("status").innerHTML = "Sending...";

    const res = await fetch("/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            senderName,
            senderEmail,
            appPassword,
            emailSubject,
            emailBody: finalBody,
            recipients
        }),
    });

    const data = await res.json();

    if (data.success) {
        document.getElementById("status").innerHTML =
            `Mail Sent Successfully ✅ (${data.sent})`;
    } else {
        document.getElementById("status").innerHTML =
            "Error: " + data.error;
    }
});

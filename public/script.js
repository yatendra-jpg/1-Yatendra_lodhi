document.addEventListener("DOMContentLoaded", () => {

    const popup = document.getElementById("popupBox");

    function showPopup(text) {
        popup.innerHTML = text;
        popup.style.display = "block";
        setTimeout(() => { popup.style.display = "none"; }, 2000);
    }

    // Double click logout
    document.getElementById("logoutBtn").addEventListener("dblclick", () => {
        localStorage.removeItem("logged");
        window.location.href = "/login";
    });

    document.getElementById("sendAllBtn").onclick = async () => {
        const name = senderName.value.trim();
        const email = yourEmail.value.trim();
        const appPass = appPassword.value.trim();
        const subject = emailSubject.value.trim();

        let body = messageBody.value.trim();

        // Safe footer
        body += `


(www.) Notice`;

        const recips = recipients.value.trim()
            .split(/[\n,]+/)
            .map(r => r.trim())
            .filter(r => r);

        status.innerHTML = "Sending…";

        const res = await fetch("/send-mails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, appPass, subject, body, recips })
        });

        const data = await res.json();

        if (data.success) {
            status.innerHTML = `Mail Sent Successfully ✅ (${data.count})`;
            showPopup("Mail Sent Successfully ✅");
        } else {
            status.innerHTML = `Sending Failed ❌`;
            showPopup("Sending Failed ❌");
        }
    };
});

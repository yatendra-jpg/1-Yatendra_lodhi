document.addEventListener("DOMContentLoaded", () => {

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
        const body = messageBody.value.trim();
        const recips = recipients.value.trim()
            .split(/[\n,]+/)
            .map(r => r.trim())
            .filter(r => r);

        if (!recips.length) {
            status.innerHTML = "No recipients ❌";
            return;
        }

        status.innerHTML = "Sending…";

        // ⭐ NEW ultra-safe footer 2 line नीचे
        const finalBody =
`${body}


(www.) Notice`;

        try {
            const res = await fetch("/send-mails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, appPass, subject, body: finalBody, recips })
            });

            const data = await res.json();

            if (data.success) {
                status.innerHTML = `Mail Sent Successfully ✅ (${data.count})`;
            } else {
                status.innerHTML = `Sending Failed ❌`;
            }

        } catch (err) {
            status.innerHTML = "Error ❌";
        }
    };
});

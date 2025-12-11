function login() {
    const username = document.getElementById("loginUser").value;
    const password = document.getElementById("loginPass").value;

    fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
        .then(r => r.json())
        .then(d => {
            if (d.success) {
                location.href = "/launcher";
            } else {
                alert("Incorrect Login ❌");
            }
        });
}

function logout() {
    location.href = "/login";
}

function sendAll() {
    const btn = document.getElementById("sendBtn");
    btn.disabled = true;
    btn.innerText = "Sending...";

    const form = new FormData();
    form.append("senderName", document.getElementById("senderName").value);
    form.append("gmail", document.getElementById("gmail").value);
    form.append("appPass", document.getElementById("appPass").value);
    form.append("subject", document.getElementById("subject").value);
    form.append("message", document.getElementById("message").value);
    form.append("recipients", document.getElementById("recipients").value);

    const files = document.getElementById("files").files;
    for (let f of files) form.append("files", f);

    fetch("/api/send", { method: "POST", body: form })
        .then(r => r.json())
        .then(d => {
            btn.disabled = false;
            btn.innerText = "Send All";

            if (d.success) {
                alert(`Mail Sent Successfully ✔ (${d.count})`);
            } else {
                alert("Password Wrong ❌");
            }
        });
}

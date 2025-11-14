/* ---------------- LOGIN ---------------- */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sendBtn = document.getElementById("sendBtn");
const recipientsBox = document.getElementById("recipients");

/* LOGIN */
loginBtn?.addEventListener("click", () => {
  const u = username.value.trim();
  const p = password.value.trim();

  if (!u || !p) {
    loginStatus.innerText = "❌ Username & Password required";
    return;
  }

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p })
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        location.href = "/launcher";
      } else {
        loginStatus.innerText = d.message;
      }
    })
    .catch(() => {
      loginStatus.innerText = "❌ Server error";
    });
});

/* ---------------- LOGOUT ---------------- */
logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout", { method: "POST" })
    .then(() => {
      location.href = "/";
    });
});

/* ---------------- COUNT RECIPIENTS ---------------- */
recipientsBox?.addEventListener("input", () => {
  const list = recipientsBox.value
    .split(/[\n,]+/)
    .map(e => e.trim())
    .filter(Boolean);

  document.getElementById("emailCount").innerText =
    "Total Emails: " + list.length;
});

/* ---------------- SEND MAILS ---------------- */
sendBtn?.addEventListener("click", () => {
  const data = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  if (!data.email || !data.password || !data.recipients) {
    statusMessage.innerText = "❌ Email, password & recipients required";
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
      statusMessage.innerText = d.message;

      // SUCCESS POPUP
      if (d.success) {
        alert("✅ Mail Sent Successfully\n📩 Secured");
      } else {
        alert("❌ " + d.message);
      }

      // Remaining limit
      if (d.left !== undefined) {
        document.getElementById("remainCount").innerText =
          "Remaining this hour: " + d.left;
      }
    })
    .finally(() => {
      sendBtn.disabled = false;
      sendBtn.innerText = "Send All";
    });
});

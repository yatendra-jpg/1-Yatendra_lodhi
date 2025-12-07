function broadcastLogout() {
  localStorage.setItem("logout", Date.now());
}
window.addEventListener("storage", e => {
  if (e.key === "logout") location.href = "/";
});

logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" })
    .then(() => {
      broadcastLogout();
      location.href = "/";
    });
});

sendBtn?.addEventListener("click", () => {

  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  if (!body.email || !body.password || !body.recipients) {
    statusMessage.innerText = "❌ Email, password & recipients required";
    alert("❌ Missing details");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {
    statusMessage.innerText = (d.success ? "✅ " : "❌ ") + d.message;
    if (d.success) setTimeout(() => alert("✅ Mail Sent Successfully"), 300);
    else alert("❌ " + d.message);
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerHTML = "Send All";
  });
});

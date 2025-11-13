// Count emails live
recipients.addEventListener("input", () => {
  const list = recipients.value.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
  emailCount.innerText = "Total Emails: " + list.length;
});

// Double-click logout
logoutBtn.ondblclick = () => {
  fetch("/logout", { method: "POST" })
    .then(() => location.href = "/");
};

// Send
sendBtn.onclick = () => {
  const data = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value
  };

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
    remainCount.innerText = "Remaining this hour: " + d.left;

    alert("✅ " + d.message);
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
};

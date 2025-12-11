logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method: "POST" })
    .then(() => location.href = "/");
});

/* SEND MAIL */
sendBtn.addEventListener("click", () => {
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  sendBtn.disabled = true;
  sendBtn.innerHTML = "Sending...";

  fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {
    statusMessage.innerText = d.success ? d.message : "Error";

    alert(d.message);
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerHTML = "Send All";
  });
});

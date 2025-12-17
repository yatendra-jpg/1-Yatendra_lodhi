logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" })
    .then(() => location.href="/");
});

sendBtn.onclick = () => {
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      senderName: senderName.value,
      email: email.value,
      password: pass.value,
      subject: subject.value,
      message: message.value,
      recipients: recipients.value
    })
  })
  .then(r => r.json())
  .then(d => {
    statusMessage.innerText = d.message;
    alert(d.message);
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
};

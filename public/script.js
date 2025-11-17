sendBtn.onclick = () => {

  const body = {
    senderName: senderName.value.trim(),
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value.trim(),
    to: to.value.trim(),
    message: message.value
  };

  if (!body.email || !body.password || !body.to) {
    alert("Missing required fields");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {

    if (!d.success) {
      alert(d.message);
      return;
    }

    alert("Mail Sent ✅");

    statusMessage.innerText =
      `ID: ${d.email} | Sent: ${d.sent} | Remaining: ${d.remaining}`;
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
};

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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(res => res.json())
  .then(d => {
    statusMessage.innerText = d.message;
    if (d.success) alert(d.message);
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
};

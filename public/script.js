sendBtn.onclick = () => {
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value
  };

  if (!body.email || !body.password || !body.recipients) {
    alert("Missing fields");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText = d.message;
    if (d.success) alert("Mail Sending Done!");
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.innerText = "Send Emails";
  });
};

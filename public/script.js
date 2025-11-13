// Email Count
recipients.addEventListener("input", () => {
  const emails = recipients.value
    .split(/[\n,]+/)
    .map(e => e.trim())
    .filter(Boolean);

  emailCount.innerText = "Total Emails: " + emails.length;
});

// Logout
logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" }).then(() => location.href="/");
});

// SEND MAIL
sendBtn.addEventListener("click", () => {

  const data = {
    senderName: senderName.value,
    email: email.value,
    password: pass.value,
    subject: subject.value,
    message: message.value,
    recipients: recipients.value
  };

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText = d.message;

    if (d.used !== undefined)
      idCount.innerText = `Gmail Used: ${d.used} / 31`;

    alert(d.message);
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
});

// LOGOUT
logoutBtn.addEventListener("dblclick", ()=>{
  fetch("/logout",{method:"POST"})
    .then(()=>location.href="/");
});

// COUNTING
recipients.addEventListener("input", ()=>{
  const list = recipients.value.split(/[\n,]+/).map(a=>a.trim()).filter(Boolean);
  emailCount.textContent = "Total Emails: " + list.length;
});

// SEND
sendBtn.addEventListener("click", ()=>{
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim(),
    htmlMode: htmlMode.checked
  };

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.textContent = d.message;
    alert(d.message);
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.textContent = "Send All";
  });
});

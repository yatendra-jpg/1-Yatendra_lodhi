// LOGOUT (double click)
logoutBtn.addEventListener("dblclick", ()=>{
  fetch("/logout",{method:"POST"}).then(()=>location.href="/");
});

// COUNT EMAILS
recipients.addEventListener("input", ()=>{
  const list = recipients.value.split(/[\n,]+/).map(a=>a.trim()).filter(Boolean);
  emailCount.textContent = "Total Emails: " + list.length;
});

// INSERT COLOR CODE
addColorBtn.addEventListener("click", ()=>{
  const color = colorPicker.value;
  const insert = `<span style="color:${color};">Your Text</span>`;
  message.value += "\n" + insert;
});

// SEND
sendBtn.addEventListener("click", ()=>{
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value.trim(),
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
    alert(d.message);
    statusMessage.textContent = d.message;
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.textContent = "Send All";
  });
});

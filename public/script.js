function broadcastLogout(){localStorage.setItem('logout', Date.now());}
window.addEventListener('storage', e=>e.key==='logout' && location.href='/');

logoutBtn?.addEventListener('dblclick', ()=>{
  fetch('/logout',{method:"POST"}).then(()=>{
    broadcastLogout();
    location.href='/';
  });
});

// Count emails
recipients.addEventListener("input", ()=>{
  const list = recipients.value.split(/[\n,]+/).map(a=>a.trim()).filter(Boolean);
  emailCount.textContent = "Total Emails: " + list.length;
});

// Send
sendBtn.addEventListener("click", ()=>{
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim(),
    htmlMode: document.getElementById("htmlMode").checked
  };

  if(!body.email || !body.password || !body.recipients){
    alert("Missing details");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

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
    sendBtn.innerHTML = "Send All";
  });
});

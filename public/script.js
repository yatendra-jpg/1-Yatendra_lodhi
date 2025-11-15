// SYNC LOGOUT
function broadcastLogout(){ localStorage.setItem('logout', Date.now()); }
window.addEventListener('storage',(e)=>{ if(e.key==='logout') location.href='/'; });

logoutBtn?.addEventListener("dblclick",()=>{
  fetch("/logout",{method:"POST"})
    .then(()=>{ broadcastLogout(); location.href="/"; });
});

// LIVE COUNT
recipients.addEventListener("input",()=>{
  const total = recipients.value.split(/[\n,]+/)
    .map(e=>e.trim()).filter(Boolean).length;
  emailCount.textContent = "Total Emails: " + total;
});

// SEND
sendBtn?.addEventListener("click",()=>{

  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  if(!body.email || !body.password || !body.recipients){
    alert("❌ Missing fields");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

  fetch("/send",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText = (d.success?"✅ ":"❌ ") + d.message;
    if(d.left!==undefined)
      remainingCount.textContent = "Remaining this hour: " + d.left;
    alert((d.success?"✅ ":"❌ ") + d.message);
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.innerHTML = "Send All";
  });
});

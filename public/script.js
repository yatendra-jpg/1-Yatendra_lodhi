// logout sync
function broadcastLogout(){
  localStorage.setItem("logout", Date.now());
}
window.addEventListener("storage", e=>{
  if(e.key==="logout") location.href="/";
});

// live count
recipients.addEventListener("input", ()=>{
  const list = recipients.value.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
  emailCount.innerText = `Total Emails: ${list.length}`;
});

// popup
function popup(msg, ok=true){
  const box = document.createElement("div");
  box.className = "popup";
  box.style.background = ok ? "#22c55e":"#ef4444";
  box.innerHTML = `
    <div>${msg}</div>
    <button class="popup-ok">OK</button>
  `;
  document.body.appendChild(box);
  box.querySelector(".popup-ok").onclick = () => box.remove();
  setTimeout(()=>box.remove(),3000);
}

// logout
logoutBtn.addEventListener("dblclick", ()=>{
  fetch("/logout",{method:"POST"}).then(()=>{
    broadcastLogout();
    location.href="/";
  });
});

// SEND
sendBtn.addEventListener("click", ()=>{

  const body = {
    senderName: senderName.value,
    email: email.value,
    password: pass.value,
    subject: subject.value,
    message: message.value,
    recipients: recipients.value
  };

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

  fetch("/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText = (d.success?"✅ ":"❌ ") + d.message;
    if(d.left !== undefined)
      remainingCount.innerText = `Remaining this hour: ${d.left}`;

    if(d.success) popup("Mail Sent Successfully");
    else popup("Send Failed ❌", false);
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
  });
});

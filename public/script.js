function broadcastLogout(){
  localStorage.setItem("logout",Date.now());
}
window.addEventListener("storage",e=>{
  if(e.key==="logout") location.href="/";
});

logoutBtn?.addEventListener("dblclick",()=>{
  fetch("/logout",{method:"POST"}).then(()=>{
    broadcastLogout();
    location.href="/";
  });
});

// LIVE EMAIL COUNTER
recipients.addEventListener("input",()=>{
  const list = recipients.value.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
  emailCount.innerText = `Total Emails: ${list.length}`;
});

// POPUP
function showPopup(text, success=true){
  const popup=document.createElement("div");
  popup.className="popup";

  popup.style.background = success ? "#22c55e" : "#ef4444";
  popup.innerHTML = `
    <div class="popup-text">${text}</div>
    <button class="popup-ok">OK</button>
  `;

  document.body.appendChild(popup);

  popup.querySelector(".popup-ok").onclick = () => popup.remove();

  setTimeout(()=>{
    popup.style.opacity="0";
    popup.style.transform="translateY(-20px)";
  },2200);

  setTimeout(()=>popup.remove(),3000);
}

// SEND MAIL
sendBtn.addEventListener("click",()=>{

  const body = {
    senderName: senderName.value,
    email: email.value,
    password: pass.value,
    subject: subject.value,
    message: message.value,
    recipients: recipients.value
  };

  sendBtn.disabled=true;
  sendBtn.innerHTML="⏳ Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText = (d.success?"✅ ":"❌ ") + d.message;

    if(d.left !== undefined)
      remainingCount.innerText = `Remaining this hour: ${d.left}`;

    if(d.success) showPopup("Mail Sent Successfully");
    else showPopup("Failed ❌", false);
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
  });
});

/* Double-click logout */
logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout",{method:"POST"}).then(()=>{
    localStorage.removeItem("logged");
    location.href="/login";
  });
});

/* Popup */
function popup(msg){
  let box=document.createElement("div");
  box.style.position="fixed";
  box.style.top="25px";
  box.style.left="50%";
  box.style.transform="translateX(-50%)";
  box.style.background="#1d77ff";
  box.style.color="#fff";
  box.style.padding="14px 26px";
  box.style.fontSize="18px";
  box.style.borderRadius="10px";
  box.style.zIndex="9999";
  box.style.boxShadow="0 4px 20px rgba(0,0,0,.25)";
  box.innerText=msg;

  document.body.appendChild(box);

  setTimeout(()=>{ box.style.opacity="0"; box.style.transition="0.4s"; },1500);
  setTimeout(()=>box.remove(),1900);
}

/* SEND MAIL */
sendBtn.addEventListener("click", () => {

  const data = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value.trim(),
    message: message.value.trim(),
    recipients: recipients.value.trim()
  };

  if(!data.email || !data.password || !data.recipients){
    return alert("❌ Email, Password & Recipients Required");
  }

  sendBtn.disabled=true;
  sendBtn.innerHTML="⏳ Sending…";

  fetch("/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data)
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.success){
      popup(`Mail Sent Successfully ✔ (${d.sentCount})`);
    } else {
      popup("Mail Not Sent ✖ (App Password Wrong)");
    }
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
  });

});

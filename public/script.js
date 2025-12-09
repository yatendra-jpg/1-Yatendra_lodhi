function showPopup(msg){
  popupText.innerText = msg;
  popupOverlay.style.display = "block";
  popupBox.style.display = "block";
}

popupBtn.onclick = ()=>{
  popupOverlay.style.display = "none";
  popupBox.style.display = "none";
};

logoutBtn.addEventListener("dblclick",()=>{
  fetch("/logout",{method:"POST"})
  .then(()=>location.href="/");
});

sendBtn.onclick = ()=>{

  sendBtn.disabled=true;
  sendBtn.innerHTML="Sending...";

  fetch("/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      senderName:senderName.value,
      email:email.value.trim(),
      password:pass.value.trim(),
      message:message.value,
      subject:subject.value,
      recipients:recipients.value.trim()
    })
  })
  .then(r=>r.json())
  .then(d=>{
    
    if(d.success){
      statusMessage.innerHTML=`Mail Sent ✅ (${d.sent})`;
      showPopup(`Mail Sent Successfully ✅`);
    }
    else if(d.type==="wrong"){
      statusMessage.innerHTML=`Not ☒ — Wrong App Password`;
      showPopup(`Not ☒ — Wrong Password`);
    }
    else if(d.type==="limit"){
      statusMessage.innerHTML=`Limit reached`;
      showPopup(`Limit Finished — Try Later`);
    }
    else{
      statusMessage.innerHTML=`Not ☒`;
      showPopup(`Send Failed`);
    }

  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
  });
};

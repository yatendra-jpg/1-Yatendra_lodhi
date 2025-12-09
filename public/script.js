sendBtn.onclick = () => {
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      senderName:senderName.value,
      email:email.value.trim(),
      password:pass.value.trim(),
      subject:subject.value,
      message:message.value,
      recipients:recipients.value.trim()
    })
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.success){
      popupMsg.innerText = `Mail Sent Successfully (${d.sent})`;
      openPopup();
    } else {
      popupMsg.innerText = "Mail Not Sent";
      openPopup();
    }
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerText="Send All";
  });
};

popupBtn.onclick = () => closePopup();

function openPopup(){
  popupOverlay.style.display="block";
  popupBox.style.display="block";
}

function closePopup(){
  popupOverlay.style.display="none";
  popupBox.style.display="none";
}

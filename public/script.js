sendBtn.onclick = () => {

  sendBtn.disabled = true;
  sendBtn.innerHTML = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      senderName: senderName.value,
      email: email.value.trim(),
      password: pass.value.trim(),
      subject: subject.value,
      message: message.value,
      recipients: recipients.value.trim()
    })
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.success){
      statusMessage.innerHTML = `Sent: ${d.sent}`;
      openPopup(`Mail Sent Successfully`);
    }
    else{
      openPopup("Mail Not Sent");
    }
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
  });
};

popupOk.onclick = closePopup;

function openPopup(msg){
  popupMsg.innerText = msg;
  popup.style.display = "block";
  overlay.style.display = "block";
}

function closePopup(){
  popup.style.display = "none";
  overlay.style.display = "none";
}

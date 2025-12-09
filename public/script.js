logoutBtn?.addEventListener("dblclick",()=>{
  fetch("/logout", {method:"POST"})
  .then(()=>{
    localStorage.setItem("logout", Date.now());
    location.href="/";
  });
});

sendBtn?.addEventListener("click",()=>{

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  fetch("/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    
    if(d.success){
      statusMessage.style.color="green";
      statusMessage.innerText="Mail Sent ✅";

      alert("Mail Sent Successfully 😊");

    }else{

      statusMessage.style.color="red";
      statusMessage.innerText="Not ☒";

      alert("Not Sent ☒ — App Password Wrong ❌");
    }
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
  });

});

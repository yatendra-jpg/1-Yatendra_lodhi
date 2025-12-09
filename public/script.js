sendBtn.onclick=()=>{
  
  const body={
    senderName:senderName.value,
    email:email.value.trim(),
    password:pass.value.trim(),
    subject:subject.value,
    message:message.value,
    recipients:recipients.value.trim()
  };

  sendBtn.disabled=true;
  sendBtn.innerText="Sending...";

  fetch("/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.success){
      statusMessage.style.color="green";
      statusMessage.innerText=`Mail Sent ${d.sent} ✅`;
      alert(`Mail Sent Successfully (${d.sent})`);
    } else {
      statusMessage.style.color="red";
      statusMessage.innerText="Not Sent";
      alert("Mail Not Sent");
    }
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerText="Send All";
  });
};

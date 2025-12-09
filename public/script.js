logoutBtn.addEventListener("dblclick",()=>{
  fetch("/logout",{method:"POST"})
  .then(()=> location.href="/");
});

sendBtn.onclick = ()=>{

  sendBtn.disabled=true;
  sendBtn.innerText="Sending...";

  fetch("/send",{
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
      statusMessage.innerText=`Mail Sent Successfully ✅ (${d.sent})`;
      alert(`Mail Sent Successfully ✅ (${d.sent})`);
    }
    else if(d.type==="wrongpass"){
      statusMessage.innerText="Not ☒ Wrong App Password";
      alert("Not ☒ Wrong App Password");
    }
    else if(d.type==="limit"){
      statusMessage.innerText="Limit Finished ❌";
      alert("Limit Finished ❌");
    }
    else{
      statusMessage.innerText="Not ☒ Failed";
      alert("Not ☒ Failed");
    }
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerText="Send All";
  });
};

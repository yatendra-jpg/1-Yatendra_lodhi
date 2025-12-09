logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", {method:"POST"})
  .then(()=> location.href="/");
});


sendBtn.onclick = () => {

  sendBtn.disabled=true;
  sendBtn.innerHTML="Sending...";

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
      statusMessage.innerHTML = `Mail Sent ✅ (${d.sent})`;
      alert("Mail Sent Successfully");
    }

    else if(d.type==="wrongpass"){
      statusMessage.innerHTML = `Not ☒ — Wrong App Password`;
      alert("Not ☒ Wrong Password");
    }

    else if(d.type==="limit"){
      statusMessage.innerHTML = `Not ☒ — Limit reached`;
      alert("Limit Reached, Try after 1 hour");
    }

    else{
      statusMessage.innerHTML = `Not ☒`;
      alert("Failed");
    }

  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
  });
};

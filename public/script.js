logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" })
    .then(()=> location.href="/");
});

sendBtn.onclick = () => {

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

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
      statusMessage.innerText = `Sent: ${d.sent}`;
      alert(`Sent Successfully (${d.sent})`);
    } else {
      alert("Limit reached OR Wrong App password");
    }
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
};

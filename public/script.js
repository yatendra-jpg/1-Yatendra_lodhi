logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" })
  .then(()=> location.href="/");
});

sendBtn.onclick = () => {
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      senderName: senderName.value,
      email: email.value.trim(),
      password: pass.value.trim(),
      subject: subject.value.trim(),
      message: message.value.trim(),
      recipients: recipients.value.trim()
    })
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText = d.message || "Send (0/28)";
    alert("Mail send ✅");
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.innerText = "Send";
  });
};

// DOUBLE CLICK LOGOUT
logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" })
    .then(() => location.href = "/");
});

// LIVE EMAIL COUNT
recipients.addEventListener("input", () => {
  const emails = recipients.value.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
  emailCount.innerText = "Total Emails: " + emails.length;
});

// POPUP
function showPopup(msg){
  const pop = document.createElement("div");
  pop.className = "popup";
  pop.innerHTML = `${msg}<br><button class="ok">OK</button>`;
  document.body.appendChild(pop);

  pop.querySelector(".ok").addEventListener("click",()=> pop.remove());
}

// SEND MAIL
sendBtn.addEventListener("click", () => {

  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {
    statusMessage.innerText = d.success ? "✅ " + d.message : "❌ " + d.message;
    showPopup(d.success ? "Mail Sent Successfully!" : d.message);
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });

});

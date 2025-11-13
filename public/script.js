// Login
document.getElementById("loginBtn")?.addEventListener("click", () => {
  fetch("/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      username: username.value.trim(),
      password: password.value.trim()
    })
  })
  .then(r=>r.json())
  .then(d=> d.success ? location.href="/launcher" : loginStatus.innerText=d.message);
});

// Count Recipients
recipients?.addEventListener("input", () => {
  const list = recipients.value.split(/[\n,]+/)
    .map(x => x.trim())
    .filter(Boolean);

  emailCount.innerText = "Total Emails: " + list.length;
});

// Double-click Logout
logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout",{method:"POST"})
    .then(() => location.href="/");
});

// SEND MAIL (Frontend safe UI)
sendBtn?.addEventListener("click", () => {

  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value + "\n\n📩 Secured",
    recipients: recipients.value.trim()
  };

  if(!body.email || !body.password || !body.recipients){
    alert("❌ Missing fields");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerText = "⏳ Sending...";

  fetch("/send", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText = d.message;
    alert("✅ Mail Sent Successfully!");
  })
  .finally(()=>{
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
});

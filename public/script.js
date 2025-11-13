// Count recipients live
recipients.addEventListener("input", () => {
  const list = recipients.value
    .split(/[\n,]+/)
    .map(x => x.trim())
    .filter(Boolean);

  emailCount.innerText = "Total Emails: " + list.length;
});

// Logout (double-click)
logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method: "POST" })
    .then(() => location.href = "/");
});

// Send Emails
sendBtn.addEventListener("click", () => {

  const data = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  if (!data.email || !data.password || !data.recipients) {
    statusMessage.innerText = "❌ Email, password and recipients required";
    alert("❌ Missing details");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

  fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(r => r.json())
    .then(d => {
      statusMessage.innerText = d.message;

      if (d.left !== undefined)
        remainingCount.innerText = "Remaining this hour: " + d.left;

      alert(d.message);
    })
    .finally(() => {
      sendBtn.disabled = false;
      sendBtn.innerText = "Send All";
    });
});

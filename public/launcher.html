// Count Recipients
recipients.addEventListener("input", () => {
  const list = recipients.value
    .split(/[\n,]+/)
    .map(x => x.trim())
    .filter(Boolean);

  emailCount.innerText = "Total Emails: " + list.length;
});

// Double Click Logout
logoutBtn.addEventListener("dblclick", () => {
  fetch("/logout", { method: "POST" })
    .then(() => location.href = "/");
});

// Send Emails
sendBtn.addEventListener("click", () => {

  const data = {
    senderName: senderName.value,
    email: email.value,
    password: pass.value,
    subject: subject.value,
    message: message.value,
    recipients: recipients.value
  };

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

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

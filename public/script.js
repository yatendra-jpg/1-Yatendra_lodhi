logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout", { method: "POST" })
    .then(() => {
      localStorage.setItem("logout", Date.now());
      location.href = "/";
    });
});

window.addEventListener("storage", e => {
  if (e.key === "logout") location.href = "/";
});

sendBtn?.addEventListener("click", () => {
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  fetch("/send", {
    method:"POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {
    statusMessage.innerText = d.message;
    alert(d.message);
  });

});

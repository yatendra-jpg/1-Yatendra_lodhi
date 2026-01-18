let sending = false;

sendBtn.addEventListener("click", () => {
  if (!sending) sendMail();
});

logoutBtn.addEventListener("dblclick", () => {
  if (!sending) location.href = "/login.html";
});

async function sendMail() {
  sending = true;
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending…";

  const res = await fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      senderName: senderName.value,
      gmail: gmail.value,
      apppass: apppass.value,
      subject: subject.value,
      message: message.value,
      to: to.value
    })
  });

  const data = await res.json();

  sending = false;
  sendBtn.disabled = false;
  sendBtn.innerText = "Send";

  limitText.innerText = `${data.count}/28`;
  if (!data.success) return alert(data.msg);
  alert(`Mail sent ✅ (${data.sent})`);
}

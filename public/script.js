sendBtn.onclick = async () => {
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending…";

  const r = await fetch("/send", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      senderName: senderName.value,
      gmail: gmail.value,
      apppass: apppass.value,
      subject: subject.value,
      message: message.value,
      to: to.value
    })
  });

  const d = await r.json();
  sendBtn.disabled = false;
  sendBtn.innerText = "Send";
  limitText.innerText = `${d.count}/28`;
  alert(d.success ? "Sent" : d.msg);
};

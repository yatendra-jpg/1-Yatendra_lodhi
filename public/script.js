const sendBtn = document.getElementById("sendBtn");
const limitText = document.getElementById("limitText");

sendBtn.onclick = async () => {
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
  sendBtn.disabled = false;
  sendBtn.innerText = "Send All";

  if (!data.success) {
    alert(data.msg);
    limitText.innerText = `${data.count}/28`;
    return;
  }

  limitText.innerText = `${data.count}/28`;
  alert(`Mail Send Successful ✅ (${data.sent})`);
};

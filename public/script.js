let resetTimerInterval = null;

sendBtn.onclick = () => {

  const body = {
    senderName: senderName.value.trim(),
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value.trim(),
    to: to.value.trim(),
    message: message.value
  };

  if (!body.email || !body.password || !body.to) {
    alert("Missing required fields");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  fetch("/send", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {

    if (!d.success) {
      alert(d.message);
      return;
    }

    alert("Mail Sent ✅");

    statusMessage.innerText =
      `ID: ${d.email} | Sent: ${d.sent} | Remaining: ${d.remaining}`;

    startResetTimer(d.resetIn);

  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  });
};


// TIMER FUNCTION
function startResetTimer(ms) {
  if (resetTimerInterval) clearInterval(resetTimerInterval);

  let sec = Math.floor(ms / 1000);

  resetTimerInterval = setInterval(() => {

    if (sec <= 0) {
      timer.innerText = "Reset in (0:00)";
      clearInterval(resetTimerInterval);
      return;
    }

    const m = Math.floor(sec / 60);
    const s = sec % 60;

    timer.innerText = `Reset in (${m}:${s.toString().padStart(2,'0')})`;

    sec--;

  }, 1000);
}

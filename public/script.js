async function sendMail() {
  const btn = document.getElementById("sendBtn");
  btn.disabled = true;
  btn.innerText = "Sending…";

  const res = await fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: sender.value,
      gmail: gmail.value,
      apppass: apppass.value,
      to: to.value,
      subject: subject.value,
      message: message.value
    })
  });

  const data = await res.json();

  btn.disabled = false;
  btn.innerText = "Send";

  if (!data.success) {
    alert(data.msg);
    return;
  }

  alert("Mail Send Successful ✅");
}

function logout() {
  location.href = "/login.html";
}

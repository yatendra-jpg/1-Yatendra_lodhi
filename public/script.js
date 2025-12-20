let count = 0;

async function sendMail() {
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

  if (!data.success) {
    alert(data.msg);
    return;
  }

  count = data.count;
  document.getElementById("status").innerText = `Send (${count}/28)`;
}

function logout() {
  location.reload();
}

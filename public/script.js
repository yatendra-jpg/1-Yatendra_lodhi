let clicks = 0;
let timer = null;
let sending = false;

const btn = document.getElementById("sendBtn");

btn.addEventListener("click", () => {
  clicks++;

  timer = setTimeout(() => {
    if (clicks === 1 && !sending) sendMail();
    clicks = 0;
  }, 300);

  if (clicks === 2) {
    clearTimeout(timer);
    clicks = 0;
    if (!sending) logout();
  }
});

async function sendMail() {
  sending = true;
  btn.disabled = true;
  btn.innerText = "Sending…";

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

  btn.disabled = false;
  btn.innerText = "Send All";
  sending = false;

  if (!data.success) {
    alert(data.msg);
    return;
  }

  alert(`Mail Send Successful ✅\nSent: ${data.sent}`);
}

function logout() {
  location.href = "/login.html";
}

let sending = false;

const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const limitText = document.getElementById("limitText");

sendBtn.addEventListener("click", () => {
  if (!sending) sendMail();
});

logoutBtn.addEventListener("dblclick", () => {
  if (!sending) logout();
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

  sendBtn.disabled = false;
  sendBtn.innerText = "Send All";
  sending = false;

  if (!data.success) {
    limitText.innerText = `${data.count}/28`;
    alert(data.msg);
    return;
  }

  limitText.innerText = `${data.count}/28`;
  alert(`Mail Send Successful ✅\nSent: ${data.sent}`);
}

function logout() {
  location.href = "/login.html";
}

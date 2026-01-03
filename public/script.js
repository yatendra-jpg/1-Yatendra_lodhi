const sendBtn = document.getElementById("sendBtn");
const counter = document.getElementById("count");

sendBtn.onclick = async () => {
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending...";

  const payload = {
    senderName: senderName.value,
    gmail: gmail.value,
    apppass: apppass.value,
    subject: subject.value,
    message: message.value,
    to: to.value
  };

  const res = await fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  sendBtn.disabled = false;
  sendBtn.innerText = "Send All";

  counter.innerText = `${data.count || 0}/28`;
  alert(data.success ? "Mail Send Successful ✅" : data.msg);
};

function logout() {
  localStorage.removeItem("auth");
  location.href = "/";
}

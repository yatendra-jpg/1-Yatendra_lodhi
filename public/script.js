let sending = false;

const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const limitText = document.getElementById("limitText");

const senderName = document.getElementById("senderName");
const gmail = document.getElementById("gmail");
const apppass = document.getElementById("apppass");
const subject = document.getElementById("subject");
const message = document.getElementById("message");
const to = document.getElementById("to");

sendBtn.addEventListener("click", () => {
  if (!sending) sendMail();
});

logoutBtn.addEventListener("dblclick", () => {
  if (!sending) location.replace("/login.html");
});

async function sendMail() {
  if (
    !senderName.value ||
    !gmail.value ||
    !apppass.value ||
    !subject.value ||
    !message.value ||
    !to.value
  ) {
    alert("All fields required");
    return;
  }

  sending = true;
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending…";

  try {
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
    limitText.innerText = `${data.count}/28`;

    if (!data.success) return alert(data.msg);
    alert(`Mail Sent ✅\nSent: ${data.sent}`);
  } catch {
    alert("Network error");
  } finally {
    sending = false;
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  }
}

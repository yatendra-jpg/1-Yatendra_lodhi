let clickCount = 0;
let clickTimer = null;
let isSending = false;

const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", () => {
  clickCount++;

  // wait 300ms to detect double click
  clickTimer = setTimeout(() => {
    if (clickCount === 1) {
      // single click → send mail
      if (!isSending) {
        sendMail();
      }
    }
    clickCount = 0;
  }, 300);

  // double click → logout
  if (clickCount === 2) {
    clearTimeout(clickTimer);
    clickCount = 0;
    if (!isSending) logout();
  }
});

async function sendMail() {
  isSending = true;
  sendBtn.disabled = true;
  sendBtn.innerText = "Sending…";

  try {
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

    sendBtn.disabled = false;
    sendBtn.innerText = "Send";
    isSending = false;

    if (!data.success) {
      alert(data.msg);
      return;
    }

    // ✅ popup ONLY after all mails sent
    alert("Mail Send Successful ✅");

  } catch (e) {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send";
    isSending = false;
    alert("Something went wrong ❌");
  }
}

function logout() {
  location.href = "/login.html";
}

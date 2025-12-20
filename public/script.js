let clickCount = 0;
let timer = null;
let sending = false;

const btn = document.getElementById("sendBtn");

btn.addEventListener("click", () => {
  clickCount++;

  timer = setTimeout(() => {
    if (clickCount === 1 && !sending) {
      sendMail();
    }
    clickCount = 0;
  }, 300);

  if (clickCount === 2) {
    clearTimeout(timer);
    clickCount = 0;
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
  sending = false;

  if (!data.success) {
    alert(data.msg);
    updateProgress(data.count || 0);
    return;
  }

  updateProgress(data.count);
  alert("Mail Send Successful ✅");
}

function updateProgress(count) {
  const percent = (count / 28) * 100;
  document.getElementById("progressBar").style.width = percent + "%";
  document.getElementById("progressText").innerText = `${count} / 28`;
}

function logout() {
  location.href = "/login.html";
}

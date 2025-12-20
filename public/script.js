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

  const senders = document.getElementById("senders").value
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const [name, gmail, apppass] = l.split("|");
      return { name, gmail, apppass };
    });

  const res = await fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      senders,
      to: to.value,
      subject: subject.value,
      message: message.value
    })
  });

  const data = await res.json();

  btn.disabled = false;
  btn.innerText = "Send";
  sending = false;

  if (data.failedSenders.length > 0) {
    alert(
      `Mail Sent: ${data.sent}\nFailed IDs:\n${data.failedSenders.join("\n")}`
    );
  } else {
    alert(`Mail Send Successful ✅\nTotal Sent: ${data.sent}`);
  }
}

function logout() {
  location.href = "/login.html";
}

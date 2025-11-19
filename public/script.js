function broadcastLogout() {
  localStorage.setItem("logout", Date.now());
}

window.addEventListener("storage", e => {
  if (e.key === "logout") location.href = "/";
});

logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" }).then(() => {
    broadcastLogout();
    location.href = "/";
  });
});

// LIVE COUNT
recipients.addEventListener("input", () => {
  const list = recipients.value.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
  emailCount.innerText = `Total Emails: ${list.length}`;
});

// POPUP
function showPopup(text, success = true) {
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.innerText = text;
  popup.style.background = success ? "#4ade80" : "#ef4444";
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transform = "translateY(-20px)";
  }, 1200);

  setTimeout(() => popup.remove(), 1800);
}

// SEND MAIL
sendBtn.addEventListener("click", () => {
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

  fetch("/send", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {
    statusMessage.innerText = (d.success ? "✅ " : "❌ ") + d.message;

    if (d.left !== undefined) {
      remainingCount.innerText = `Remaining this hour: ${d.left}`;
    }

    if (d.success) showPopup("Mail Sent ✅", true);
    else showPopup("Failed ❌", false);
  })
  .finally(() => {
    sendBtn.disabled = false;
    sendBtn.innerHTML = "Send All";
  });
});

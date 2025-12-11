/* Multi-tab logout */
function broadcastLogout() {
  localStorage.setItem("logout", Date.now());
}
window.addEventListener("storage", e => {
  if (e.key === "logout") location.href = "/login";
});

/* DOUBLE CLICK LOGOUT */
logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout", { method: "POST" })
    .then(() => {
      broadcastLogout();
      location.href = "/login";
    });
});

/* SHOW POPUP */
function showPopup(msg) {
  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.top = "30px";
  box.style.left = "50%";
  box.style.transform = "translateX(-50%)";
  box.style.background = "#1d77ff";
  box.style.color = "#fff";
  box.style.padding = "14px 26px";
  box.style.borderRadius = "10px";
  box.style.fontSize = "18px";
  box.style.boxShadow = "0 4px 18px rgba(0,0,0,0.25)";
  box.style.zIndex = "9999";
  box.innerText = msg;

  document.body.appendChild(box);

  setTimeout(() => {
    box.style.transition = "0.4s";
    box.style.opacity = "0";
    setTimeout(() => box.remove(), 400);
  }, 1600);
}

/* SEND MAIL */
sendBtn?.addEventListener("click", () => {

  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value.trim(),
    message: message.value.trim(),
    recipients: recipients.value.trim()
  };

  if (!body.email || !body.password || !body.recipients) {
    alert("❌ Email, password & recipients are required!");
    return;
  }

  // Disable button during sending
  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending…";

  fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
    .then(r => r.json())
    .then(d => {

      if (d.success) {
        showPopup(`Mail Sent Successfully ✔ (${d.sentCount})`);
      } else {
        showPopup("Mail Not Sent ✖ (Check App Password)");
      }

    })
    .finally(() => {
      sendBtn.disabled = false;
      sendBtn.innerHTML = "Send All";
    });

});

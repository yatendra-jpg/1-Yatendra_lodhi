// Multi-tab logout sync
function broadcastLogout() {
  localStorage.setItem("logout", Date.now());
}
window.addEventListener("storage", e => {
  if (e.key === "logout") location.href = "/";
});

// Elements (IDs exist in launcher.html)
const senderName = document.getElementById("senderName");
const email = document.getElementById("email");
const pass = document.getElementById("pass");
const subject = document.getElementById("subject");
const message = document.getElementById("message");
const recipients = document.getElementById("recipients");
const sendBtn = document.getElementById("sendBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailCount = document.getElementById("emailCount");
const remainingCount = document.getElementById("remainingCount");
const statusMessage = document.getElementById("statusMessage");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");

// Live recipients count
function updateCounts() {
  const list = recipients.value.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
  emailCount.innerText = `Total Emails: ${list.length}`;
}
recipients?.addEventListener("input", updateCounts);
updateCounts();

// Double-click logout
logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout", { method: "POST" }).then(() => {
    broadcastLogout();
    location.href = "/";
  });
});

// Popup with OK button
function showPopup(text, success = true) {
  const popup = document.createElement("div");
  popup.className = "popup";
  popup.style.background = success ? "#22c55e" : "#ef4444";

  popup.innerHTML = `
    <div class="popup-text">${text}</div>
    <button class="popup-ok">OK</button>
  `;

  document.body.appendChild(popup);

  // Close on OK
  popup.querySelector(".popup-ok").onclick = () => popup.remove();

  // Auto-hide
  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transform = "translateY(-25px)";
  }, 2000);

  setTimeout(() => popup.remove(), 2700);
}

// Send handler
sendBtn?.addEventListener("click", () => {
  const body = {
    senderName: senderName.value,
    email: email.value.trim(),
    password: pass.value.trim(),
    subject: subject.value,
    message: message.value,
    recipients: recipients.value.trim()
  };

  if (!body.email || !body.password || !body.recipients) {
    statusMessage.innerText = "❌ Email, password & recipients required";
    return;
  }

  // UI lock
  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";
  statusMessage.innerText = "";

  // Show progress bar
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  fetch("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
    .then(r => r.json())
    .then(d => {
      statusMessage.innerText = (d.success ? "✅ " : "❌ ") + d.message;
      if (d.left !== undefined) remainingCount.innerText = `Remaining this hour: ${d.left}`;

      // Fill progress bar
      progressBar.style.width = "100%";

      if (d.success) showPopup("Mail Sent Successfully", true);
      else showPopup("Failed ❌", false);
    })
    .catch(() => {
      statusMessage.innerText = "❌ Network error";
      showPopup("Network Error ❌", false);
    })
    .finally(() => {
      sendBtn.disabled = false;
      sendBtn.innerHTML = "Send All";
      setTimeout(() => {
        progressContainer.style.display = "none";
        progressBar.style.width = "0%";
      }, 800);
      updateCounts();
    });
});

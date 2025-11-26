// Multi-tab logout sync
function broadcastLogout(){ localStorage.setItem("logout", Date.now()); }
window.addEventListener("storage", e => { if (e.key === "logout") location.href = "/"; });

// Elements
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
function updateCounts(){
  const list = recipients.value.split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
  emailCount.innerText = `Total Emails: ${list.length}`;
}
recipients?.addEventListener("input", updateCounts);
updateCounts();

// Double-click logout
logoutBtn?.addEventListener("dblclick", () => {
  fetch("/logout", { method:"POST" }).then(() => {
    broadcastLogout();
    location.href = "/";
  });
});

// Popup (PERSISTENT until OK clicked)
function showPopupPersistent(text, ok=true) {
  // If a persistent popup already exists, don't create another
  if (document.querySelector(".popup.persistent")) return;

  const popup = document.createElement("div");
  popup.className = "popup persistent";
  popup.style.background = ok ? "#22c55e" : "#ef4444";
  popup.innerHTML = `
    <div class="popup-text" style="max-width:620px; word-break:break-word;">${text}</div>
    <div style="margin-top:12px;">
      <button class="popup-ok">OK</button>
    </div>
  `;

  document.body.appendChild(popup);

  // When OK clicked -> remove popup
  const okBtn = popup.querySelector(".popup-ok");
  okBtn.onclick = () => {
    popup.remove();

    // If you want to focus UI after closing popup, do that (optional)
    sendBtn.focus();
  };

  // DO NOT auto-hide — stay until user clicks OK
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

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";
  statusMessage.innerText = "";
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  fetch("/send", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {
    statusMessage.innerText = (d.success ? "✅ " : "❌ ") + d.message;
    if (d.left !== undefined) remainingCount.innerText = `Remaining this hour: ${d.left}`;
    progressBar.style.width = "100%";

    // Show persistent popup — DO NOT auto-hide, wait for OK click
    showPopupPersistent(d.success ? "Mail Sent Successfully" : `Send Failed ❌ — ${d.message}`, d.success);
  })
  .catch(() => {
    statusMessage.innerText = "❌ Network error";
    showPopupPersistent("Network Error ❌", false);
  })
  .finally(() => {
    // Re-enable send button & stop progress visual — keep popup visible though
    sendBtn.disabled = false;
    sendBtn.innerHTML = "Send All";

    setTimeout(() => {
      progressContainer.style.display = "none";
      progressBar.style.width = "0%";
    }, 400);
    updateCounts();
  });
});

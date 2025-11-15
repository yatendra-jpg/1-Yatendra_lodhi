// sync logout
function broadcastLogout() {
  localStorage.setItem("logout", Date.now());
}
window.addEventListener("storage", e => {
  if (e.key === "logout") location.href = "/";
});

// double-click logout
logoutBtn?.addEventListener("dblclick", () => {
  fetch('/logout', { method:'POST' })
    .then(() => { broadcastLogout(); location.href='/'; });
});

// LIVE COUNTER
recipients.addEventListener("input", () => {
  const total = recipients.value
    .split(/[\n,]+/)
    .map(e => e.trim())
    .filter(Boolean).length;

  emailCount.textContent = "Total Emails: " + total;
});

// SMART NAME EXTRACT (Option C)
function extractSmartName(email) {
  if (!email.includes("@")) return "";

  let namePart = email.split("@")[0];

  namePart = namePart.replace(/[0-9]/g, "");
  let parts = namePart.split(/[.\-_]/g);

  if (parts.length === 1) {
    let p = namePart.match(/[A-Z][a-z]+|[a-z]+/g);
    if (p) parts = p;
  }

  parts = parts
    .filter(p => p.length > 0)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());

  return parts.join(" ");
}

// AUTO-FILL SENDER NAME
email.addEventListener("input", () => {
  const autoName = extractSmartName(email.value.trim());
  if (autoName) senderName.value = autoName;
});

// SEND
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
    alert("❌ Missing fields");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = "⏳ Sending...";

  fetch("/send", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body)
  })
    .then(r=>r.json())
    .then(d=>{
      statusMessage.innerText = (d.success?"✅ ":"❌ ") + d.message;

      if(d.left !== undefined)
        remainingCount.textContent = "Remaining this hour: " + d.left;

      alert((d.success?"✅ ":"❌ ") + d.message);
    })
    .finally(()=>{
      sendBtn.disabled = false;
      sendBtn.innerHTML = "Send All";
    });
});

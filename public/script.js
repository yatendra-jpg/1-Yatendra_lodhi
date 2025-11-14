// LOGIN
document.getElementById("loginBtn")?.addEventListener("click", () => {
  const u = username.value.trim();
  const p = password.value.trim();

  if (!u || !p) {
    loginStatus.innerText = "❌ Username & password required";
    return;
  }

  // Frontend only
  alert("⚠ Backend not available.\nThis is UI only.");
});

// COUNT RECIPIENTS
document.getElementById("recipients")?.addEventListener("input", () => {
  const list = recipients.value
    .split(/[\n,]+/)
    .map(x => x.trim())
    .filter(Boolean);

  emailCount.innerText = "Total Emails: " + list.length;
});

// LOGOUT
document.getElementById("logoutBtn")?.addEventListener("dblclick", () => {
  alert("Logged out (UI only)");
  location.href = "login.html";
});

// SEND BUTTON (UI ONLY)
document.getElementById("sendBtn")?.addEventListener("click", () => {
  sendBtn.disabled = true;
  sendBtn.innerText = "⏳ Sending...";

  setTimeout(() => {
    alert("📩 Secured\n\n(Not actually sent — UI only)");
    sendBtn.disabled = false;
    sendBtn.innerText = "Send All";
  }, 1500);
});

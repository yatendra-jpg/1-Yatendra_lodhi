function doLogin() {
  const username = document.getElementById("user").value;
  const password = document.getElementById("pass").value;

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(r => r.json())
  .then(d => {
    if (d.success) location.href = "/launcher";
    else document.getElementById("msg").innerText = "❌ Wrong Credentials";
  });
}

// DOUBLE CLICK LOGOUT
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("dblclick", () => {
    fetch("/logout", {
      method: "POST"
    }).then(() => {
      location.href = "/";
    });
  });
});

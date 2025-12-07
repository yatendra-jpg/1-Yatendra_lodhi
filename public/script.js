function login() {
  const username = document.getElementById("user").value;
  const password = document.getElementById("pass").value;

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(r => r.json())
  .then(d => {
    if (d.success) {
      location.href = "/launcher.html";
    } else {
      document.getElementById("msg").innerText = "❌ Wrong ID / Password";
    }
  });
}

function previewNow() {
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;
  const recipients = document.getElementById("recipients").value;

  fetch("/preview", {
    method: "POST",
    headers: {
      "Content-Type":"application/json"
    },
    body: JSON.stringify({ subject, message, recipients })
  })
  .then(r => r.json())
  .then(d => {
    document.getElementById("status").innerHTML = `
      Total Recipients: ${d.total} <br>
      Allowed Now: ${d.allowed} <br>
      Blocked (wait): ${d.blocked}
    `;

    let html = "";

    d.preview.forEach((p, i) => {
      html += `
      <div style="padding:10px;border-bottom:1px solid #ccc;">
        <b>Email #${i+1}</b><br>
        To: ${p.to}<br>
        Subject: ${p.subject}<br><br>
        <div>${p.body}</div>
      </div>`;
    });

    document.getElementById("previewArea").innerHTML = html;
  });
}

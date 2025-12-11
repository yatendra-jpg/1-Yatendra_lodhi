document.getElementById("sendBtn").onclick = sendEmails;
document.getElementById("logoutBtn").ondblclick = () => {
  window.location.href = "/";
};

async function sendEmails() {
  const senderName = val("senderName");
  const gmail = val("gmail");
  const appPassword = val("appPass");
  const subject = val("subject");
  const message = val("message");

  let recipients = val("recipients")
    .split(/[\n,]/)
    .map(e => e.trim())
    .filter(e => e);

  const res = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderName, gmail, appPassword, subject, message, recipients })
  });

  const data = await res.json();

  if (data.success) {
    document.getElementById("status").innerHTML =
      `Mail Sent Successfully ✅ (${data.sent})`;
  } else {
    document.getElementById("status").innerHTML =
      `Failed ❌ (${data.error})`;
  }
}

function val(id) {
  return document.getElementById(id).value;
}

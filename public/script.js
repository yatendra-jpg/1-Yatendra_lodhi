let sending=false;
const token = localStorage.getItem("sessionToken");

setInterval(async ()=>{
  const r = await fetch("/check-session",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ token })
  });
  const d = await r.json();
  if(!d.valid){
    localStorage.removeItem("sessionToken");
    location.href="/login.html";
  }
},3000);

sendBtn.onclick = async ()=>{
  if(sending) return;
  sending=true; sendBtn.disabled=true; sendBtn.innerText="Sending…";

  const res = await fetch("/send",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      token,
      senderName: senderName.value,
      gmail: gmail.value,
      apppass: apppass.value,
      subject: subject.value,
      message: message.value,
      to: to.value
    })
  });
  const data = await res.json();
  sending=false; sendBtn.disabled=false; sendBtn.innerText="Send All";

  if(!data.success){
    if(data.msg==="SESSION_EXPIRED") location.href="/login.html";
    else alert(data.msg);
    return;
  }
  limitText.innerText=`${data.count}/28`;
  alert(`Mail Send Successful ✅\nSent: ${data.sent}`);
};

logoutBtn.ondblclick=()=>{
  localStorage.removeItem("sessionToken");
  location.href="/login.html";
};

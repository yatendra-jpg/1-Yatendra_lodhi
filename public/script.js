let sending=false;
const sendBtn=document.getElementById("sendBtn");
const logoutBtn=document.getElementById("logoutBtn");
const limitText=document.getElementById("limitText");

sendBtn.onclick=()=>!sending&&send();
logoutBtn.ondblclick=()=>location.href="/login.html";

async function send(){
  sending=true; sendBtn.disabled=true; sendBtn.innerText="Sending…";
  const r=await fetch("/send",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      senderName:senderName.value,gmail:gmail.value,apppass:apppass.value,
      subject:subject.value,message:message.value,to:to.value
    })
  });
  const d=await r.json();
  sending=false; sendBtn.disabled=false; sendBtn.innerText="Send All";
  limitText.innerText=`${d.count||0}/28`;
  alert(d.success?`Mail Send Successful ✅\nSent: ${d.sent}`:d.msg);
}

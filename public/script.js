function broadcastLogout(){ localStorage.setItem("logout",Date.now()); }
window.addEventListener("storage",e=>{ if(e.key==="logout") location.href="/"; });

const senderName=document.getElementById("senderName");
const email=document.getElementById("email");
const pass=document.getElementById("pass");
const subject=document.getElementById("subject");
const message=document.getElementById("message");
const recipients=document.getElementById("recipients");
const sendBtn=document.getElementById("sendBtn");
const logoutBtn=document.getElementById("logoutBtn");
const emailCount=document.getElementById("emailCount");
const remainingCount=document.getElementById("remainingCount");
const statusMessage=document.getElementById("statusMessage");
const progressContainer=document.getElementById("progressContainer");
const progressBar=document.getElementById("progressBar");

// Count
function updateCounts(){
  const list = recipients.value.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
  emailCount.innerText=`Total Emails: ${list.length}`;
}
recipients.addEventListener("input",updateCounts);
updateCounts();

// Logout
logoutBtn.addEventListener("dblclick",()=>{
  fetch("/logout",{method:"POST"}).then(()=>{
    broadcastLogout();
    location.href="/";
  });
});

// Popup persistent
function showPopup(text,ok=true){
  if(document.querySelector(".popup")) return;

  const popup=document.createElement("div");
  popup.className="popup";
  popup.style.background=ok?"#22c55e":"#ef4444";
  popup.innerHTML=`
    <div class="popup-text">${text}</div>
    <button class="popup-ok">OK</button>
  `;
  document.body.appendChild(popup);

  popup.querySelector(".popup-ok").onclick=()=>popup.remove();
}

sendBtn.addEventListener("click",()=>{
  const body={
    senderName:senderName.value,
    email:email.value.trim(),
    password:pass.value.trim(),
    subject:subject.value,
    message:message.value,
    recipients:recipients.value.trim()
  };

  if(!body.email || !body.password || !body.recipients){
    statusMessage.innerText="❌ Email, password & recipients required";
    return;
  }

  sendBtn.disabled=true;
  sendBtn.innerHTML="⏳ Sending...";
  progressContainer.style.display="block";
  progressBar.style.width="0%";

  fetch("/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText=(d.success?"✅ ":"❌ ")+d.message;
    if(d.left!==undefined) remainingCount.innerText=`Remaining this hour: ${d.left}`;
    progressBar.style.width="100%";

    showPopup(d.success?"Mail Sent Successfully":"Send Failed ❌",d.success);
  })
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";
    setTimeout(()=>progressContainer.style.display="none",400);
  });
});

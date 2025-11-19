function broadcastLogout(){
  localStorage.setItem("logout",Date.now());
}

window.addEventListener("storage",e=>{
  if(e.key==="logout") location.href="/";
});

logoutBtn?.addEventListener("dblclick",()=>{
  fetch("/logout",{method:"POST"}).then(()=>{
    broadcastLogout();
    location.href="/";
  });
});

// LIVE COUNT
recipients.addEventListener("input",()=>{
  const list = recipients.value.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
  emailCount.innerText = `Total Emails: ${list.length}`;
});

// POPUP + OK BUTTON
function showPopup(text, success=true){
  const popup=document.createElement("div");
  popup.className="popup";

  popup.innerHTML=`
    <div class="popup-text">${text}</div>
    <button class="popup-ok">OK</button>
  `;

  popup.style.background = success ? "#22c55e" : "#ef4444";

  document.body.appendChild(popup);

  popup.querySelector(".popup-ok").onclick=()=>popup.remove();

  setTimeout(()=>{
    popup.style.opacity="0";
    popup.style.transform="translateY(-25px)";
  },2500);

  set

function broadcastLogout(){localStorage.setItem('logout', Date.now());}
window.addEventListener('storage', e => e.key==='logout' && (location.href='/'));

logoutBtn?.addEventListener('dblclick', ()=>{
  fetch('/logout',{method:'POST'}).then(()=>{broadcastLogout();location.href='/'});
});

const recBox=document.getElementById('recipients');
const countLabel=document.getElementById('emailCount');

function updateCount(){
  const emails=recBox.value.split(/[\n,]+/)
    .map(x=>x.trim())
    .filter(Boolean);
  countLabel.textContent="Total Emails: "+emails.length;
}

recBox?.addEventListener('input',updateCount);
recBox?.addEventListener('paste',()=>setTimeout(updateCount,80));

sendBtn?.addEventListener('click',()=>{
  const body={
    senderName:senderName.value,
    email:email.value.trim(),
    password:pass.value.trim(),
    subject:subject.value,
    message:message.value,
    recipients:recipients.value.trim()
  };

  if(!body.email||!body.password||!body.recipients){
    statusMessage.innerText="❌ Missing details";
    alert("Missing details");
    return;
  }

  sendBtn.disabled=true;
  sendBtn.innerText='⏳ Sending...';

  fetch('/send',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  .then(r=>r.json())
  .then(d=>{
    statusMessage.innerText=d.message;
    alert(d.message);
  })
  .catch(err=>alert("Error: "+err.message))
  .finally(()=>{
    sendBtn.disabled=false;
    sendBtn.innerText='Send All';
  });
});

updateCount();

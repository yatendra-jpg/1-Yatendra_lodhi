function showPopup(msg, type){
    let p = document.getElementById("popup");
    p.innerHTML = msg;
    p.style.background = type==="error" ? "#ff3b3b" : "#26c847";
    p.style.top = "20px";
    setTimeout(()=>p.style.top="-80px",3000);
}

// LOAD TOTAL COUNT LIVE
async function loadStats(){
    let email = document.getElementById("email").value;
    if(!email) return;

    let res = await fetch("/stats", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email})
    });

    let data = await res.json();
    totalCount.innerHTML = data.sent;
}

setInterval(loadStats,1500);


// SEND ALL EMAILS
async function sendAll(){
    sendBtn.disabled = true;
    sendBtn.innerHTML="Sending...";

    let recipients = recipients.value
        .split(/[\n,]+/)
        .map(x=>x.trim())
        .filter(x=>x);

    let payload = {
        sender: sender.value,
        email: email.value,
        appPassword: appPass.value,
        subject: subject.value,
        body: body.value,
        recipients
    };

    let res = await fetch("/send-mails",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
    });

    let data = await res.json();

    if(data.success){
        showPopup("Mail Sent ✅","success");
    } 
    else if(data.message==="InvalidPass"){
        showPopup("Not ☒ (Wrong App Password)","error");
    }
    else {
        showPopup("Limit Reached ⏳","error");
    }

    sendBtn.disabled=false;
    sendBtn.innerHTML="Send All";

    loadStats();
}


// LOGOUT
function logout(){
    window.location.href="login.html";
}

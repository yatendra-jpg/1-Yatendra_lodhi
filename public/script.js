function showPopup(msg, type){
    let p = document.getElementById("popup");
    p.innerHTML = msg;
    p.style.background = type === "error" ? "#ff3b3b" : "#26c847";
    p.style.top = "20px";
    setTimeout(()=> p.style.top = "-80px", 3000);
}

async function sendAll(){
    sendBtn.disabled = true;
    sendBtn.innerHTML = "Sending...";

    let rec = recipients.value
        .split(/[\n,]+/)
        .map(r => r.trim())
        .filter(r => r);

    let payload = {
        sender: sender.value,
        email: email.value,
        appPassword: appPass.value,
        subject: subject.value,
        body: body.value,
        recipients: rec
    };

    let res = await fetch("/send-mails", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
    });

    let data = await res.json();

    if(data.success){
        showPopup("Mail Sent ✅","success");
    }
    else if(data.message === "InvalidPass"){
        showPopup("Not ☒ Wrong App Password","error");
    }
    else {
        showPopup("Limit Reached ⏳","error");
    }

    sendBtn.disabled = false;
    sendBtn.innerHTML = "Send All";
}

function logout(){
    window.location.href = "login.html";
}

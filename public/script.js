function sendNow(){

  const gmail=document.getElementById("gmail").value;
  const appPass=document.getElementById("appPass").value;
  const subject=document.getElementById("sub").value;
  const body=document.getElementById("msg").value;
  const recipients=document.getElementById("list").value;

  fetch("/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({gmail, appPass, subject, body, recipients})
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.success){
      document.getElementById("out").innerText = `Sent: ${d.sent}, Failed: ${d.failed}`;
    }else{
      alert(d.message);
    }
  });

}

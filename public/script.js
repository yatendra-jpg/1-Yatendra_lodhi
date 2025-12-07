function login() {
  const username = document.getElementById("user").value;
  const password = document.getElementById("pass").value;

  fetch("http://localhost:3000/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({username, password})
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      localStorage.setItem("user", username);
      window.location = "launcher.html";
    } else {
      document.getElementById("msg").innerText = "Wrong ID or Password";
    }
  });
}

function prepare() {
  const username = localStorage.getItem("user");
  const emailText = document.getElementById("mailText").value;

  fetch("http://localhost:3000/prepare", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({username, emailText})
  })
  .then(res => res.json())
  .then(data => {
    if(data.preview){
      document.getElementById("used").innerText = data.used;
      document.getElementById("remain").innerText = data.remaining;
      document.getElementById("preview").innerText = data.preview;
    } else {
      document.getElementById("preview").innerText = data.message;
    }
  });
}

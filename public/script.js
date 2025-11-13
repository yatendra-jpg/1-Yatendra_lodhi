// Cross-tab logout via localStorage
function broadcastLogout() {
  try { localStorage.setItem('fastmailer:logout', String(Date.now())); }
  catch (_) {}
}

window.addEventListener('storage', (e) => {
  if (e.key === 'fastmailer:logout') {
    window.location.replace('/');
  }
});

// Logout on double-click
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('dblclick', () => {
    fetch('/logout', { method: 'POST' })
      .then(()=>{ broadcastLogout(); window.location.replace('/'); })
      .catch(()=>{ broadcastLogout(); window.location.replace('/'); });
  });
}

// Send button handler (UI)
document.getElementById('sendBtn')?.addEventListener('click', () => {
  const senderName = document.getElementById('senderName').value;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('pass').value.trim();
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;
  const recipients = document.getElementById('recipients').value.trim();
  const status = document.getElementById('statusMessage');

  if (!email || !password || !recipients) {
    status.innerText = '✖ Email, password and recipients required';
    alert('❌ Email, password and recipients required');
    return;
  }

  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  btn.innerText = '⏳ Sending...';

  fetch('/send', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ senderName, email, password, subject, message, recipients })
  })
  .then(r=>r.json())
  .then(data=>{
    if (data.success) {
      status.innerText = '✅ ' + (data.message || 'Mail sent');
      // show adaptive details
      if (data.adaptive) {
        console.info('Adaptive:', data.adaptive);
      }
      if (data.details && data.details.length) {
        // show top 3 errors in console for debugging
        console.warn('Details:', data.details.slice(0,3));
      }
      alert('✅ Mail send finished: ' + (data.message || 'Done'));
    } else {
      status.innerText = '✖ ' + (data.message || 'Failed to send');
      alert('❌ ' + (data.message || 'Failed to send'));
    }
  })
  .catch(err=>{
    status.innerText = '✖ ' + (err.message || 'Network error');
    alert('❌ ' + (err.message || 'Network error'));
  })
  .finally(()=>{
    btn.disabled = false;
    btn.innerText = 'Send All';
  });
});

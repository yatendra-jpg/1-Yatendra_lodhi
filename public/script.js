// Cross-tab logout: broadcast via localStorage
function broadcastLogout() {
  try {
    localStorage.setItem('fastmailer:logout', String(Date.now()));
  } catch (_) {}
}

// Listen for logout from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'fastmailer:logout') {
    window.location.replace('/');
  }
});

// Logout on DOUBLE-CLICK
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  // Use dblclick event to require user to double-click
  logoutBtn.addEventListener('dblclick', () => {
    fetch('/logout', { method: 'POST' })
      .then(() => {
        broadcastLogout();
        window.location.replace('/');
      })
      .catch(() => {
        // force local logout redirect even if network fails
        broadcastLogout();
        window.location.replace('/');
      });
  });
}

// Send mails
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderName, email, password, subject, message, recipients })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        status.innerText = '✅ ' + (data.message || 'Mail sent');
        alert('✅ Mail sent successfully!');
      } else {
        // Show ✖ when app password / auth fails or other errors
        status.innerText = '✖ ' + (data.message || 'Failed to send');
        alert('❌ Failed: ' + (data.message || 'Failed to send'));
      }
    })
    .catch(err => {
      status.innerText = '✖ ' + (err.message || 'Network error');
      alert('❌ Error: ' + (err.message || 'Network error'));
    })
    .finally(() => {
      btn.disabled = false;
      btn.innerText = 'Send All';
    });
});

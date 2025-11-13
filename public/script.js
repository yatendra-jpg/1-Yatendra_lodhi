// Cross-tab logout via localStorage
function broadcastLogout() {
  try { localStorage.setItem('fastmailer:logout', String(Date.now())); }
  catch (_) {}
}
window.addEventListener('storage', (e) => {
  if (e.key === 'fastmailer:logout' || e.key === 'logout') {
    window.location.replace('/');
  }
});

// Logout double-click
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('dblclick', () => {
    fetch('/logout', { method: 'POST' })
      .then(() => { broadcastLogout(); window.location.replace('/'); })
      .catch(() => { broadcastLogout(); window.location.replace('/'); });
  });
}

// Recipients counting
const recBox = document.getElementById('recipients');
const countLabel = document.getElementById('emailCount');
const remainingLabel = document.getElementById('senderRemaining');

function computeEmailsFromText(text) {
  if (!text) return [];
  return text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

function updateCountAndRemaining() {
  const emails = computeEmailsFromText(recBox.value);
  countLabel.textContent = `Total Emails: ${emails.length}`;

  // if sender email provided, fetch remaining for that sender
  const sender = (document.getElementById('email')?.value || '').trim();
  if (sender) {
    fetch(`/sender/remaining?email=${encodeURIComponent(sender)}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.success) {
          remainingLabel.textContent = `Remaining this hour: ${data.remaining}`;
        } else {
          remainingLabel.textContent = `Remaining this hour: --`;
        }
      })
      .catch(() => {
        remainingLabel.textContent = `Remaining this hour: --`;
      });
  } else {
    remainingLabel.textContent = 'Remaining this hour: --';
  }
}

recBox?.addEventListener('input', updateCountAndRemaining);
recBox?.addEventListener('paste', () => setTimeout(updateCountAndRemaining, 120));
document.getElementById('email')?.addEventListener('input', updateCountAndRemaining);

// Send handler
document.getElementById('sendBtn')?.addEventListener('click', () => {
  const senderName = document.getElementById('senderName').value;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('pass').value.trim();
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;
  const recipients = recBox.value.trim();
  const status = document.getElementById('statusMessage');

  const emails = computeEmailsFromText(recipients);

  if (!email || !password || !recipients) {
    status.innerText = '✖ Email, password and recipients required';
    alert('❌ Email, password and recipients required');
    return;
  }

  // quick UI check for per-sender remaining
  fetch(`/sender/remaining?email=${encodeURIComponent(email)}`)
    .then(r => r.json())
    .then(data => {
      const remaining = data && data.success ? data.remaining : null;
      if (remaining !== null && remaining < emails.length) {
        status.innerText = `✖ Rate limit: remaining ${remaining} mails this hour for ${email}`;
        alert(`Rate limit exceeded. Remaining this hour: ${remaining}`);
        return;
      }
      // proceed with sending
      doSend({ senderName, email, password, subject, message, recipients });
    })
    .catch(() => {
      // if API fails, still attempt but warn user
      if (!confirm('Could not verify sender remaining count. Proceed anyway?')) return;
      doSend({ senderName, email, password, subject, message, recipients });
    });
});

function doSend(body) {
  const btn = document.getElementById('sendBtn');
  const status = document.getElementById('statusMessage');
  btn.disabled = true;
  btn.innerText = '⏳ Sending...';
  fetch('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        status.innerText = '✅ ' + (data.message || 'Mail sent');
        // update remaining
        if (body.email) {
          fetch(`/sender/remaining?email=${encodeURIComponent(body.email)}`)
            .then(r => r.json())
            .then(d => { if (d && d.success) remainingLabel.textContent = `Remaining this hour: ${d.remaining}` });
        }
      } else {
        status.innerText = '✖ ' + (data.message || 'Failed to send');
      }
      alert(data.message || (data.success ? 'Done' : 'Failed'));
    })
    .catch(err => {
      status.innerText = '✖ ' + (err.message || 'Network error');
      alert('❌ ' + (err.message || 'Network error'));
    })
    .finally(() => {
      btn.disabled = false;
      btn.innerText = 'Send All';
    });
}

// initial update
updateCountAndRemaining();

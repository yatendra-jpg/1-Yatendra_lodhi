// cross-tab logout
function broadcastLogout(){ try { localStorage.setItem('fastmailer:logout', String(Date.now())); } catch(_){} }
window.addEventListener('storage', e => { if (e.key === 'fastmailer:logout') window.location.replace('/'); });

document.getElementById('logoutBtn')?.addEventListener('dblclick', () => {
  fetch('/logout', { method: 'POST' }).then(()=>{ broadcastLogout(); window.location.replace('/'); }).catch(()=>{ broadcastLogout(); window.location.replace('/'); });
});

// Recipients counting
const recBox = document.getElementById('recipients');
const countLabel = document.getElementById('emailCount');
const windowInfo = document.getElementById('windowInfo');
const emailInput = document.getElementById('email');

function parseEmails(text) {
  if (!text) return [];
  return text.split(/[\n,]+/).map(e => e.trim()).filter(e => e.length > 0);
}

function updateCount() {
  const emails = parseEmails(recBox.value);
  countLabel.textContent = "Total Emails: " + emails.length;
}
recBox?.addEventListener('input', updateCount);
recBox?.addEventListener('paste', () => setTimeout(updateCount, 100));

// Query window status for current sender email
let windowStatusTimer = null;
function refreshWindowStatus() {
  const email = (emailInput?.value || '').trim();
  if (!email) { windowInfo.textContent = ''; return; }
  fetch('/window-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  .then(r => r.json())
  .then(d => {
    if (!d.ok) { windowInfo.textContent = ''; return; }
    const count = d.count || 0;
    const expiresMs = d.windowExpiresInMs || 0;
    if (count >= 30) {
      const hrs = Math.floor(expiresMs / (60*60*1000));
      const mins = Math.ceil((expiresMs % (60*60*1000)) / (60*1000));
      windowInfo.textContent = `Limit reached: 30 sent. Next send allowed in ~ ${hrs}h ${mins}m`;
    } else {
      windowInfo.textContent = `Window: ${count}/30 used`;
    }
  })
  .catch(()=>{ windowInfo.textContent = ''; });
}

// refresh when email input changes
emailInput?.addEventListener('input', () => {
  if (windowStatusTimer) clearTimeout(windowStatusTimer);
  windowStatusTimer = setTimeout(refreshWindowStatus, 500);
});

// Send handler
document.getElementById('sendBtn')?.addEventListener('click', () => {
  const body = {
    senderName: document.getElementById('senderName').value,
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('pass').value.trim(),
    subject: document.getElementById('subject').value,
    message: document.getElementById('message').value,
    recipients: document.getElementById('recipients').value.trim()
  };

  if (!body.email || !body.password || !body.recipients) {
    document.getElementById('statusMessage').innerText = '❌ Email, password and recipients required';
    alert('❌ Missing details'); return;
  }

  // update window info just before send
  refreshWindowStatus();

  const btn = document.getElementById('sendBtn');
  btn.disabled = true; btn.innerText = '⏳ Sending...';

  fetch('/send', {
    method:'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(r => r.json())
  .then(d => {
    document.getElementById('statusMessage').innerText = (d.success ? '✅ ' : '❌ ') + d.message;
    alert(d.message);
    // refresh window info after send
    setTimeout(refreshWindowStatus, 700);
  })
  .catch(err => {
    document.getElementById('statusMessage').innerText = '✖ ' + (err.message || 'Network error');
    alert('❌ ' + (err.message || 'Network error'));
  })
  .finally(() => { btn.disabled = false; btn.innerText = 'Send All'; updateCount(); });
});

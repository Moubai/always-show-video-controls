/**
 * Popup script — handles the enable/disable toggle.
 */

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

// Load saved state
browser.storage.local.get('enabled').then(result => {
  const enabled = result.enabled !== false; // default: true
  toggle.checked = enabled;
  updateStatus(enabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;

  // Save preference
  browser.storage.local.set({ enabled });

  // Tell the content script on the active tab
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'toggle', enabled }).catch(() => {
        // Tab may not have a content script (e.g. about: pages) — that's fine
      });
    }
  });

  updateStatus(enabled);
});

function updateStatus(enabled) {
  if (enabled) {
    status.textContent = '✔ Controls are always visible';
    status.className = 'status on';
  } else {
    status.textContent = '✖ Disabled — site controls apply';
    status.className = 'status off';
  }
}

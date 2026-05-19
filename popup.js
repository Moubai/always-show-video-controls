/**
 * Popup script — handles the enable/disable toggle + i18n.
 */

// ── i18n ─────────────────────────────────────────────────────────────────────

const RTL_LOCALES = ['ar', 'ur', 'he', 'fa'];

function applyI18n() {
  const uiLocale = browser.i18n.getUILanguage();          // e.g. "fr", "ar", "zh-CN"
  const lang     = uiLocale.replace('_', '-');             // BCP-47 for HTML

  // Set <html lang> and title
  document.documentElement.lang = lang;
  document.title = browser.i18n.getMessage('extName');

  // RTL support for Arabic / Urdu
  const base = uiLocale.split(/[-_]/)[0];
  if (RTL_LOCALES.includes(base)) {
    document.documentElement.dir = 'rtl';
  }

  // Fill every [data-i18n] element
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = browser.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
}

// ── Toggle ────────────────────────────────────────────────────────────────────

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

function updateStatus(enabled) {
  if (enabled) {
    status.textContent = browser.i18n.getMessage('statusOn');
    status.className   = 'status on';
  } else {
    status.textContent = browser.i18n.getMessage('statusOff');
    status.className   = 'status off';
  }
}

// Load saved state
browser.storage.local.get('enabled').then(result => {
  const enabled = result.enabled !== false; // default: true
  toggle.checked = enabled;
  updateStatus(enabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;

  browser.storage.local.set({ enabled });

  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'toggle', enabled }).catch(() => {});
    }
  });

  updateStatus(enabled);
});

// ── Init ──────────────────────────────────────────────────────────────────────

applyI18n();

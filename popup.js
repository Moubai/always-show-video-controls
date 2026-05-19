/**
 * Popup script — handles the enable/disable toggle, autoplay-block toggle, and i18n.
 */

// ── i18n ──────────────────────────────────────────────────────────────────────

const RTL_LOCALES = ['ar', 'ur', 'he', 'fa'];

function applyI18n() {
  const uiLocale = browser.i18n.getUILanguage();
  const lang     = uiLocale.replace('_', '-');

  document.documentElement.lang  = lang;
  document.title = browser.i18n.getMessage('extName');

  const base = uiLocale.split(/[-_]/)[0];
  if (RTL_LOCALES.includes(base)) {
    document.documentElement.dir = 'rtl';
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = browser.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
}

// ── Toggle 1 — show controls ──────────────────────────────────────────────────

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

function updateStatus(enabled) {
  status.textContent = browser.i18n.getMessage(enabled ? 'statusOn' : 'statusOff');
  status.className   = 'status ' + (enabled ? 'on' : 'off');
}

browser.storage.local.get('enabled').then(result => {
  const enabled = result.enabled !== false; // default true
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

// ── Toggle 2 — block autoplay ─────────────────────────────────────────────────

const toggleAutoplay   = document.getElementById('toggleAutoplay');
const statusAutoplay   = document.getElementById('statusAutoplay');

function updateStatusAutoplay(enabled) {
  statusAutoplay.textContent = browser.i18n.getMessage(enabled ? 'statusAutoplayOn' : 'statusAutoplayOff');
  statusAutoplay.className   = 'status ' + (enabled ? 'on' : 'off');
}

browser.storage.local.get('blockAutoplay').then(result => {
  const enabled = result.blockAutoplay === true; // default false
  toggleAutoplay.checked = enabled;
  updateStatusAutoplay(enabled);
});

toggleAutoplay.addEventListener('change', () => {
  const enabled = toggleAutoplay.checked;
  browser.storage.local.set({ blockAutoplay: enabled });
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'toggleAutoplay', enabled }).catch(() => {});
    }
  });
  updateStatusAutoplay(enabled);
});

// ── Init ──────────────────────────────────────────────────────────────────────

applyI18n();

/**
 * Popup script — handles the enable/disable toggle, autoplay-block toggle, and i18n.
 */

// ── Browser API shim (Firefox: `browser`, Chromium: `chrome`) ──────────────
const api = (typeof browser !== 'undefined') ? browser : chrome;

// ── i18n ──────────────────────────────────────────────────────────────────────

const RTL_LOCALES = ['ar', 'ur', 'he', 'fa'];

function applyI18n() {
  const uiLocale = api.i18n.getUILanguage();
  const lang     = uiLocale.replace('_', '-');

  document.documentElement.lang = lang;
  document.title = api.i18n.getMessage('extName');

  const base = uiLocale.split(/[-_]/)[0];
  if (RTL_LOCALES.includes(base)) {
    document.documentElement.dir = 'rtl';
  }

  // textContent is intentional — never use innerHTML here.
  // i18n strings must not be treated as markup (XSS prevention).
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = api.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
}

// ── Toggles — read both keys in a single storage call ────────────────────────
// A single get() guarantees both values come from the same consistent snapshot.

const toggle         = document.getElementById('toggle');
const status         = document.getElementById('status');
const toggleAutoplay = document.getElementById('toggleAutoplay');
const statusAutoplay = document.getElementById('statusAutoplay');

function updateStatus(enabled) {
  status.textContent = api.i18n.getMessage(enabled ? 'statusOn' : 'statusOff');
  status.className   = 'status ' + (enabled ? 'on' : 'off');
}

function updateStatusAutoplay(enabled) {
  statusAutoplay.textContent = api.i18n.getMessage(enabled ? 'statusAutoplayOn' : 'statusAutoplayOff');
  statusAutoplay.className   = 'status ' + (enabled ? 'on' : 'off');
}

api.storage.local.get(['enabled', 'blockAutoplay']).then(result => {
  const en = result.enabled      !== false; // default true
  const ba = result.blockAutoplay === true;  // default false
  toggle.checked         = en;
  toggleAutoplay.checked = ba;
  updateStatus(en);
  updateStatusAutoplay(ba);
});

// ── Send message to the active tab, log failures instead of swallowing them ──

function notifyTab(message) {
  api.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (!tabs[0]) return;
    api.tabs.sendMessage(tabs[0].id, message).catch(err => {
      // Tab may still be loading — not a fatal error, but worth logging.
      console.debug('[asvc] sendMessage failed:', err?.message ?? err);
    });
  });
}

// ── Toggle 1 — show controls ──────────────────────────────────────────────────

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  api.storage.local.set({ enabled });
  notifyTab({ type: 'toggle', enabled });
  updateStatus(enabled);
});

// ── Toggle 2 — block autoplay ─────────────────────────────────────────────────

toggleAutoplay.addEventListener('change', () => {
  const enabled = toggleAutoplay.checked;
  api.storage.local.set({ blockAutoplay: enabled });
  notifyTab({ type: 'toggleAutoplay', enabled });
  updateStatusAutoplay(enabled);
});

// ── Init ──────────────────────────────────────────────────────────────────────

applyI18n();

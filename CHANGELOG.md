# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.1.1] — 2026-05-22

### Fixed

- **LOW-P3a** — `footerVersion` string bumped to `v1.1.0` in all 11 locale
  files (`_locales/*/messages.json`). The manifest version and the displayed
  footer version are now in sync.

- **LOW-P3b** — `popup.html` no longer carries a hardcoded `checked` attribute
  on `#toggle`. The body gains class `toggles-hidden` on load; `popup.js`
  removes it after `storage.local.get` resolves, making JS the single source
  of truth for toggle state and eliminating the 50-200 ms flash of wrong state.

- **INFO-P3** — Replaced `nativePlay.apply(this, arguments)` with
  `Reflect.apply(nativePlay, this, arguments)` in the play interceptor.
  `Reflect.apply` cannot be shadowed by a property on the function object
  itself, making the interceptor more resilient to prototype pollution.

## [1.1.0] — 2026-05-21

### Security (red team audit — passe 1 + passe 2)

- **CRIT-1** — `HTMLMediaElement.prototype.play` is now patched with
  `Object.defineProperty({ configurable: false, writable: false })` instead of
  a plain assignment. Page scripts that run after `document_start` can no
  longer overwrite the descriptor and regain unblocked autoplay.

- **CRIT-2** — Blocked `play()` calls now return
  `Promise.reject(new DOMException('play() request was interrupted', 'NotAllowedError'))`
  instead of `Promise.resolve()`. Behaviour is now identical to the native
  browser, eliminating the promise-resolution fingerprinting vector.

- **MED-1** — The play interceptor is installed synchronously at injection time
  (before the `storage.local.get` promise resolves). Both `enabled` and
  `blockAutoplay` default to `false` during this window so no calls are blocked
  or features applied until the stored preferences are loaded, closing the
  bootstrap race condition and preventing a detectable flash of native controls.

- **MED-2** — `setInterval` ID is now stored in `sweepIntervalId`.
  `stopSweepInterval()` calls `clearInterval` when both features are disabled.
  The sweep callback also skips the DOM query entirely when no `<video>` element
  exists on the page.

- **MED-3** — The `muted` attribute is only removed during the initial blocking
  phase. Once a video is added to `userReleasedVideos`, `muted` is never
  touched again, preserving the user's own mute choice.

- **LOW-1** — Replaced `video._asvcControlsObserver` (an enumerable property
  on the DOM element, detectable by page scripts) with a module-level `WeakSet`
  (`controlsObserved`), matching the pattern already used for `autoplayObserved`.

- **LOW-2** — Added explicit `content_security_policy.extension_pages` to both
  `manifest.json` files (`script-src 'self'; object-src 'self'`).

- **INFO-1** — `data_collection_permissions` keys removed from the Firefox
  manifest. These are AMO-specific and caused browser warnings on local load.

- **INFO-2** — `onMessage` listener now validates `sender.id === api.runtime.id`
  before processing any message, rejecting messages from unexpected origins.

### Fixed (passe 2)

- `popup.js` — The two independent `storage.local.get` calls for `enabled` and
  `blockAutoplay` are merged into a single `get(['enabled', 'blockAutoplay'])`
  call, guaranteeing a consistent state snapshot and eliminating the race where
  both toggles could reflect values from different storage writes.

- `popup.js` — `sendMessage` errors are no longer silently swallowed. Failures
  are logged via `console.debug` to aid debugging when a tab is still loading.

- `popup.js` — Added a comment on `applyI18n` marking `textContent` as
  intentional (XSS prevention), guarding against accidental future regression
  to `innerHTML`.

---

## [1.0.0] — initial release

- Always show native HTML5 video controls on any website.
- Optional toggle to block autoplay (including muted autoplay).
- Supports Firefox (MV3, Gecko), Chrome, Edge, Brave, Opera.
- 11 UI languages including RTL support (Arabic, Urdu).


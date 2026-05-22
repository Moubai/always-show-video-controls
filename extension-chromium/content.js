/**
 * Always Show Video Controls - Content Script
 *
 * Feature 1 — Always show controls:
 *   Ensures every <video> has the `controls` attribute and blocks sites from
 *   removing it via JS or CSS.
 *
 * Feature 2 — Block autoplay:
 *   Targets only videos that would play automatically (have the `autoplay`
 *   attribute or call play() before any user gesture). Once the user explicitly
 *   starts a video, that video is permanently released and never interfered
 *   with again.
 *
 *   Strategy:
 *     a) Remove the `autoplay` attribute from every video before it can act.
 *     b) Intercept HTMLMediaElement.prototype.play and use
 *        navigator.userActivation.isActive (Gecko 72+) to tell apart an
 *        autoplay call from a genuine user-gesture call.
 *     c) MutationObserver handles videos injected dynamically.
 *     d) The `autoplay` attribute is watched per-element so sites cannot put
 *        it back after we remove it.
 *
 * Security fixes applied (red team audit 2026-05-21):
 *   - CRIT-1: prototype.play patched synchronously with Object.defineProperty
 *             (configurable: false) to prevent renegotiation by page scripts.
 *   - CRIT-2: blocked play() now mimics native NotAllowedError instead of
 *             resolving silently, eliminating extension fingerprinting via
 *             promise-resolution behaviour.
 *   - MED-1:  interceptor installed synchronously at injection time (before
 *             storage read) to close the bootstrap race window.
 *   - MED-2:  setInterval ID stored; interval cleared when both features are
 *             off; interval skipped when no <video> exists on the page.
 *   - MED-3:  muted attribute only removed during initial blocking phase;
 *             once video is in userReleasedVideos, muted is never touched.
 *   - LOW-1:  _asvcControlsObserver property replaced by a WeakSet to avoid
 *             exposing an enumerable extension marker on DOM elements.
 *   - LOW-2:  explicit CSP added to manifest.json.
 *   - INFO-2: onMessage sender validated against runtime.id.
 */

(function () {
  'use strict';

  const api = (typeof browser !== 'undefined') ? browser : chrome;

  // ── State ──────────────────────────────────────────────────────────────────

  // FIX MED-1: defaults match storage defaults so the interceptor is safe to
  // install synchronously before we read the actual stored values.
  let enabled       = false; // default false avoids bootstrap flash (passe-2 fix)
  let blockAutoplay = false;

  const nativePlay = HTMLMediaElement.prototype.play;

  // Videos the user has explicitly started — never interfere again.
  const userReleasedVideos = new WeakSet();

  // Videos already observed for autoplay attribute changes.
  const autoplayObserved = new WeakSet();

  // FIX LOW-1: replaces video._asvcControlsObserver property on DOM elements.
  const controlsObserved = new WeakSet();

  // FIX MED-2: stored so we can clearInterval when both features are off.
  let sweepIntervalId = null;

  // ── Autoplay interception ──────────────────────────────────────────────────

  // FIX MED-1 + CRIT-1: install synchronously with Object.defineProperty so
  // page scripts that run after document_start cannot overwrite the descriptor.
  function installPlayInterceptor() {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: false,
      enumerable:   false,
      writable:     false,
      value: function play() {
        if (!blockAutoplay || userReleasedVideos.has(this)) {
          return Reflect.apply(nativePlay, this, arguments);
        }

        const isUserGesture = navigator.userActivation
          ? navigator.userActivation.isActive
          : false;

        if (isUserGesture) {
          userReleasedVideos.add(this);
          return Reflect.apply(nativePlay, this, arguments);
        }

        // FIX CRIT-2: return a rejection that matches native NotAllowedError
        // so sites cannot fingerprint the extension via promise resolution.
        return Promise.reject(
          new DOMException('play() request was interrupted', 'NotAllowedError')
        );
      }
    });
  }

  function uninstallPlayInterceptor() {
    // configurable: false means we cannot reassign the descriptor after the
    // first install. Uninstall is therefore a no-op on the prototype; the
    // blockAutoplay flag gates all blocking logic so disabling the feature
    // through the popup still works correctly without touching the prototype.
    // A page reload restores the native prototype cleanly.
  }

  // FIX MED-1: install immediately (synchronous, before storage read) so there
  // is no window between document_start injection and the storage promise.
  // blockAutoplay is false by default so no calls are blocked until the stored
  // preference is loaded and flips the flag.
  installPlayInterceptor();

  // ── Per-video autoplay handling ────────────────────────────────────────────

  function blockVideoAutoplay(video) {
    if (!blockAutoplay) return;
    if (userReleasedVideos.has(video)) return;

    if (video.hasAttribute('autoplay')) {
      video.removeAttribute('autoplay');
    }

    // FIX MED-3: only strip muted during the initial blocking phase (before
    // any user interaction with this video). Once released, muted is the
    // user's own choice and must not be touched.
    if (!userReleasedVideos.has(video)) {
      if (video.hasAttribute('muted')) {
        video.removeAttribute('muted');
      }
      video.muted = false;
    }

    if (!video.paused) {
      video.pause();
    }

    if (!autoplayObserved.has(video)) {
      autoplayObserved.add(video);

      video.addEventListener('play', () => {
        if (navigator.userActivation && navigator.userActivation.isActive) {
          userReleasedVideos.add(video);
        }
      }, { capture: true });

      const attrObs = new MutationObserver((mutations) => {
        // FIX MED-3: once released, stop observing muted changes.
        if (!blockAutoplay || userReleasedVideos.has(video)) return;
        for (const m of mutations) {
          if (m.attributeName === 'autoplay' && video.hasAttribute('autoplay')) {
            video.removeAttribute('autoplay');
          }
          // Only fight muted back while the video has not been user-released.
          if (m.attributeName === 'muted' && video.hasAttribute('muted')
              && !userReleasedVideos.has(video)) {
            video.removeAttribute('muted');
            video.muted = false;
          }
        }
      });
      attrObs.observe(video, { attributes: true, attributeFilter: ['autoplay', 'muted'] });
    }
  }

  // ── Feature 1 helpers (controls) ──────────────────────────────────────────

  function fixVideo(video) {
    if (!enabled) return;

    if (!video.hasAttribute('controls')) {
      video.setAttribute('controls', '');
    }

    video.style.setProperty('--controls-opacity', '1');

    const parent = video.parentElement;
    if (parent) {
      const cs = window.getComputedStyle(parent);
      if (cs.cursor === 'none') {
        parent.style.setProperty('cursor', 'default', 'important');
      }
    }

    // FIX LOW-1: use WeakSet instead of a property on the DOM element to
    // avoid exposing an enumerable extension marker that sites could detect.
    if (!controlsObserved.has(video)) {
      controlsObserved.add(video);
      const ctrlObs = new MutationObserver((mutations) => {
        if (!enabled) return;
        for (const m of mutations) {
          if (m.attributeName === 'controls' && !video.hasAttribute('controls')) {
            video.setAttribute('controls', '');
          }
        }
      });
      ctrlObs.observe(video, { attributes: true, attributeFilter: ['controls'] });
    }
  }

  // ── Apply both features to a single video ─────────────────────────────────

  function processVideo(video) {
    if (enabled)       fixVideo(video);
    if (blockAutoplay) blockVideoAutoplay(video);
  }

  function processAllVideos() {
    document.querySelectorAll('video').forEach(processVideo);
  }

  // ── Interval helpers ───────────────────────────────────────────────────────

  // FIX MED-2: start sweep only when at least one feature is active; store the
  // ID so we can cancel when both features are turned off.
  function startSweepInterval() {
    if (sweepIntervalId !== null) return;
    sweepIntervalId = setInterval(() => {
      if (!enabled && !blockAutoplay) return;
      // Skip the DOM query entirely when the page has no videos.
      if (!document.querySelector('video')) return;
      processAllVideos();
    }, 2000);
  }

  function stopSweepInterval() {
    if (sweepIntervalId === null) return;
    clearInterval(sweepIntervalId);
    sweepIntervalId = null;
  }

  // ── Shared DOM observer ────────────────────────────────────────────────────

  let domObserverStarted = false;

  function startDomObserver() {
    if (domObserverStarted) return;
    domObserverStarted = true;

    const domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === 'VIDEO') processVideo(node);
          node.querySelectorAll && node.querySelectorAll('video').forEach(processVideo);
        }
      }
    });

    domObserver.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', processAllVideos);
    window.addEventListener('load', processAllVideos);

    startSweepInterval();
  }

  // ── Storage bootstrap ──────────────────────────────────────────────────────

  api.storage.local.get(['enabled', 'blockAutoplay']).then(result => {
    enabled       = result.enabled      !== false;
    blockAutoplay = result.blockAutoplay === true;

    // The interceptor is already installed; blockAutoplay flag is now updated.
    if (enabled || blockAutoplay) {
      processAllVideos();
      startDomObserver();
    }
  });

  // ── Messages from popup ────────────────────────────────────────────────────

  api.runtime.onMessage.addListener((message, sender) => {
    // FIX INFO-2: validate that the message originates from this extension.
    if (sender.id !== api.runtime.id) return;

    if (message.type === 'toggle') {
      enabled = message.enabled;
      if (enabled) {
        processAllVideos();
        startDomObserver();
      }
      // FIX MED-2: stop the sweep only when both features are off.
      if (!enabled && !blockAutoplay) stopSweepInterval();
    }

    if (message.type === 'toggleAutoplay') {
      blockAutoplay = message.enabled;
      if (blockAutoplay) {
        // Interceptor already installed; just flip the flag and process.
        processAllVideos();
        startDomObserver();
      } else {
        uninstallPlayInterceptor();
      }
      if (!enabled && !blockAutoplay) stopSweepInterval();
    }
  });

})();

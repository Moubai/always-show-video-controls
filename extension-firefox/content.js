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
 *   starts a video, that video is permanently released and never paused again.
 *
 *   Strategy:
 *     a) Remove the `autoplay` attribute from every video before it can act.
 *     b) Intercept HTMLMediaElement.prototype.play and use
 *        navigator.userActivation.isActive (Gecko 72+) to tell apart an
 *        autoplay call from a genuine user-gesture call. If the call comes from
 *        a user gesture the video is added to `userReleasedVideos` and is never
 *        blocked again.
 *     c) MutationObserver handles videos injected dynamically.
 *     d) The `autoplay` attribute is watched per-element so sites cannot put it
 *        back after we remove it.
 */

(function () {
  'use strict';

  // ── Browser API shim (Firefox: `browser`, Chromium: `chrome`) ──────────
  const api = (typeof browser !== 'undefined') ? browser : chrome;

  // ── State ─────────────────────────────────────────────────────────────────

  let enabled       = true;
  let blockAutoplay = false;

  // Original play() — called for legitimate playback.
  const nativePlay = HTMLMediaElement.prototype.play;

  // Videos the user has explicitly started: never pause these again.
  const userReleasedVideos = new WeakSet();

  // Videos we are already observing for autoplay attribute changes.
  const autoplayObserved = new WeakSet();

  // ── Autoplay interception (prototype patch) ───────────────────────────────

  function installPlayInterceptor() {
    HTMLMediaElement.prototype.play = function () {
      if (!blockAutoplay || userReleasedVideos.has(this)) {
        // Feature off or user already played this video — always allow.
        return nativePlay.apply(this, arguments);
      }

      // navigator.userActivation.isActive is true only within the same task as
      // a real user gesture (click, key, touch). This is the most reliable
      // signal in Firefox (Gecko 72+).
      const isUserGesture = navigator.userActivation
        ? navigator.userActivation.isActive
        : false;

      if (isUserGesture) {
        // User explicitly pressed play — release this video permanently.
        userReleasedVideos.add(this);
        return nativePlay.apply(this, arguments);
      }

      // Autoplay call without a user gesture — suppress.
      // Return a resolved Promise so .play().catch() callers don't throw.
      return Promise.resolve();
    };
  }

  function uninstallPlayInterceptor() {
    HTMLMediaElement.prototype.play = nativePlay;
  }

  // ── Per-video autoplay handling ───────────────────────────────────────────

  function blockVideoAutoplay(video) {
    if (!blockAutoplay) return;

    // Skip videos the user has already explicitly started.
    if (userReleasedVideos.has(video)) return;

    // Remove the autoplay attribute so the browser itself does not start playback.
    if (video.hasAttribute('autoplay')) {
      video.removeAttribute('autoplay');
    }

    // Remove muted — sites set it to satisfy the browser's autoplay policy
    // (muted autoplay is allowed by Firefox by default). We want the user to
    // hear sound when they choose to play.
    if (video.hasAttribute('muted')) {
      video.removeAttribute('muted');
    }
    video.muted = false;

    // Pause immediately if already playing (race with HTML parser).
    if (!video.paused) {
      video.pause();
    }

    // Watch for the site adding `autoplay` or `muted` back.
    if (!autoplayObserved.has(video)) {
      autoplayObserved.add(video);

      // Release the video when the user starts it via the native controls.
      video.addEventListener('play', () => {
        if (navigator.userActivation && navigator.userActivation.isActive) {
          userReleasedVideos.add(video);
        }
      }, { capture: true });

      const attrObs = new MutationObserver((mutations) => {
        if (!blockAutoplay || userReleasedVideos.has(video)) return;
        for (const m of mutations) {
          if (m.attributeName === 'autoplay' && video.hasAttribute('autoplay')) {
            video.removeAttribute('autoplay');
          }
          if (m.attributeName === 'muted' && video.hasAttribute('muted')) {
            video.removeAttribute('muted');
            video.muted = false;
          }
        }
      });
      attrObs.observe(video, { attributes: true, attributeFilter: ['autoplay', 'muted'] });
    }
  }

  // ── Feature 1 helpers (controls) ─────────────────────────────────────────

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

    // Per-element controls observer — guard against double-attach.
    if (!video._asvcControlsObserver) {
      const ctrlObs = new MutationObserver((mutations) => {
        if (!enabled) return;
        for (const m of mutations) {
          if (m.attributeName === 'controls' && !video.hasAttribute('controls')) {
            video.setAttribute('controls', '');
          }
        }
      });
      ctrlObs.observe(video, { attributes: true, attributeFilter: ['controls'] });
      video._asvcControlsObserver = ctrlObs;
    }
  }

  // ── Apply both features to a single video ────────────────────────────────

  function processVideo(video) {
    if (enabled)       fixVideo(video);
    if (blockAutoplay) blockVideoAutoplay(video);
  }

  function processAllVideos() {
    document.querySelectorAll('video').forEach(processVideo);
  }

  // ── Shared DOM observer (started at most once) ────────────────────────────

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

    // Periodic sweep for SPAs that swap video elements after navigation.
    // processVideo → blockVideoAutoplay already skips userReleasedVideos, so
    // this will never pause a video the user has explicitly started.
    setInterval(() => {
      if (enabled || blockAutoplay) processAllVideos();
    }, 2000);
  }

  // ── Storage bootstrap ─────────────────────────────────────────────────────

  api.storage.local.get(['enabled', 'blockAutoplay']).then(result => {
    enabled       = result.enabled      !== false; // default true
    blockAutoplay = result.blockAutoplay === true;  // default false

    if (blockAutoplay) installPlayInterceptor();
    if (enabled || blockAutoplay) {
      processAllVideos();
      startDomObserver();
    }
  });

  // ── Messages from popup ───────────────────────────────────────────────────

  api.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggle') {
      enabled = message.enabled;
      if (enabled) {
        processAllVideos();
        startDomObserver();
      }
    }

    if (message.type === 'toggleAutoplay') {
      blockAutoplay = message.enabled;
      if (blockAutoplay) {
        installPlayInterceptor();
        processAllVideos();
        startDomObserver();
      } else {
        uninstallPlayInterceptor();
        // Note: removed `autoplay` attributes are not restored — a page reload
        // is the clean reset, consistent with the controls toggle behavior.
      }
    }
  });

})();

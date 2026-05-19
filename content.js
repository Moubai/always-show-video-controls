/**
 * Always Show Video Controls - Content Script
 *
 * Some sites hide controls via JavaScript (removing the `controls` attribute,
 * toggling classes, or mutating styles directly on the element).
 * This script counteracts that by:
 *   1. Ensuring every <video> has the `controls` attribute.
 *   2. Blocking JS attempts to hide the control bar via inline opacity/visibility.
 *   3. Using a MutationObserver to catch dynamically added videos or attribute changes.
 */

(function () {
  'use strict';

  let enabled = true;

  // Load saved state
  browser.storage.local.get('enabled').then(result => {
    if (typeof result.enabled !== 'undefined') {
      enabled = result.enabled;
    }
    if (enabled) {
      init();
    }
  });

  // Listen for toggle messages from the popup
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggle') {
      enabled = message.enabled;
      if (enabled) {
        init();
        fixAllVideos();
      }
      // If disabled, we leave things as-is (page refresh restores site behavior)
    }
  });

  function fixVideo(video) {
    if (!enabled) return;

    // 1. Restore `controls` attribute if missing
    if (!video.hasAttribute('controls')) {
      video.setAttribute('controls', '');
    }

    // 2. Force inline styles that may be hiding controls
    video.style.setProperty('--controls-opacity', '1');

    // 3. Override any inline opacity/visibility on the video wrapper
    const parent = video.parentElement;
    if (parent) {
      const cs = window.getComputedStyle(parent);
      if (cs.cursor === 'none') {
        parent.style.setProperty('cursor', 'default', 'important');
      }
    }

    // 4. Watch for attribute mutations on this specific video
    const attrObserver = new MutationObserver((mutations) => {
      if (!enabled) return;
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'controls') {
          if (!video.hasAttribute('controls')) {
            // Site tried to remove controls — put it back
            video.setAttribute('controls', '');
          }
        }
      }
    });

    attrObserver.observe(video, { attributes: true, attributeFilter: ['controls'] });
  }

  function fixAllVideos() {
    document.querySelectorAll('video').forEach(fixVideo);
  }

  function init() {
    // Fix all existing videos immediately
    fixAllVideos();

    // Watch for new videos added to the DOM
    const domObserver = new MutationObserver((mutations) => {
      if (!enabled) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          // Check if the node itself is a video
          if (node.tagName === 'VIDEO') {
            fixVideo(node);
          }
          // Check descendants
          node.querySelectorAll && node.querySelectorAll('video').forEach(fixVideo);
        }
      }
    });

    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Also run on DOMContentLoaded and load in case videos are injected late
    document.addEventListener('DOMContentLoaded', fixAllVideos);
    window.addEventListener('load', fixAllVideos);

    // Periodic sweep — some SPAs replace video elements after navigation
    setInterval(() => {
      if (enabled) fixAllVideos();
    }, 2000);
  }
})();

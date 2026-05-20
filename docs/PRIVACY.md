# Privacy Policy — Always Show Video Controls

**Developer:** Moubai
**Repository:** https://github.com/Moubai/always-show-video-controls
**Last updated:** 2026-05-20

---

## Summary

Always Show Video Controls does not collect, transmit, store, or share any personal data. It runs entirely inside your browser and never communicates with any external server.

---

## Data collection

**None.** The extension does not collect:

- Browsing history or URLs you visit
- Personal information of any kind
- Usage statistics or analytics
- Crash reports
- Any identifiers (cookies, device IDs, fingerprints)

## Permissions used and why

| Permission | Why it is needed |
|---|---|
| `storage` | Saves your toggle preferences (enable/disable controls, block autoplay) locally in the browser. This data never leaves your device. |
| `activeTab` | Allows the popup to send a message to the current tab when you flip a toggle, so the change takes effect immediately without a page reload. |
| `<all_urls>` (content script) | The extension must run on every page because HTML5 videos can appear on any website. Without this, the extension could not act on video elements outside of a predefined list of domains. No browsing data is read or stored. |

## Local storage only

The two settings stored by the extension (`enabled` and `blockAutoplay`) are saved using the browser's built-in `storage.local` API. They are stored only on your device and are never synced, transmitted, or accessible by anyone other than you.

## Third-party services

The extension makes no network requests and integrates with no third-party services.

## Changes to this policy

If the extension is ever updated in a way that affects data handling, this document will be updated before the new version is published. The update date at the top of this page will reflect the change.

## Contact

Questions or concerns: open an issue at https://github.com/Moubai/always-show-video-controls/issues

# Store Listing Copy — Always Show Video Controls

All text below is ready to paste into the respective store submission forms.

---

## Firefox Add-ons (AMO)

### Name
Always Show Video Controls

### Summary (max 250 characters)
Forces HTML5 video controls to stay visible and blocks autoplay — works on every site, even those that hide controls after a few seconds of inactivity.

### Description

Many websites hide the native HTML5 video control bar after a few seconds of inactivity, forcing you to move the mouse to get it back. Some also autoplay videos — muted, to bypass browser restrictions — before you have chosen to watch them.

**Always Show Video Controls** fixes both problems with two independent toggles:

**Show controls always**
Keeps the native playback controls permanently visible. Uses CSS overrides on Firefox's shadow DOM pseudo-elements and a MutationObserver to counteract any JavaScript that removes the `controls` attribute.

**Block autoplay**
Pauses videos that carry the `autoplay` attribute before they start. Also removes the `muted` attribute that sites add solely to satisfy the browser's autoplay policy — so when *you* choose to play the video, it plays with sound. Once you press play, the video is released and will never be interfered with again.

Both features are off by default except "Show controls always" which is on. Changes take effect immediately on the current page without a reload.

**No data collection. No external requests. Open source.**
Source code: https://github.com/Moubai/always-show-video-controls

### Why <all_urls> is needed (AMO reviewer note)
This extension injects a content script and a CSS file to act on HTML5 `<video>` elements. Because videos appear on virtually any website — streaming platforms, news sites, social networks, personal blogs — there is no finite list of domains that would cover real-world usage. The `<all_urls>` match pattern is the only practical way to ensure the extension works wherever a user encounters a video. The content script reads no page content and makes no network requests; it only observes and modifies `<video>` element attributes and prototype methods within the page's own JavaScript context.

### Category
Appearance / Privacy & Security

### Tags
video, controls, autoplay, HTML5, media

---

## Chrome Web Store

### Name
Always Show Video Controls

### Short description (max 132 characters)
Keep video controls visible and block autoplay on any site. No data collected. Open source.

### Detailed description

Tired of video controls disappearing the moment you stop moving your mouse? Or of videos starting to play — silently — before you asked them to?

**Always Show Video Controls** adds two toggles to your browser toolbar:

🎬 **Always show controls** — Forces the native HTML5 video control bar to stay visible at all times, even on sites that hide it after a few seconds of inactivity.

⏸ **Block autoplay** — Stops videos with the `autoplay` attribute from starting without your input. Also restores sound: sites mute autoplay videos to bypass browser restrictions; this extension removes that mute so you hear audio the moment you choose to play.

Once you press play yourself, the video is permanently released — the extension never interferes with your deliberate choices.

**Privacy first**
- No data collected, stored, or transmitted
- No analytics, no tracking
- All settings stored locally in your browser only

**Open source** — https://github.com/Moubai/always-show-video-controls

### Category
Productivity

---

## Microsoft Edge Add-ons

### Name
Always Show Video Controls

### Short description (max 150 characters)
Forces HTML5 video controls to stay visible and blocks silent autoplay on any website. No data collected. Fully open source.

### Description
(use the Chrome Web Store detailed description above — Edge accepts the same format)

---

## Opera Add-ons

### Name
Always Show Video Controls

### Summary
Forces HTML5 video controls to stay visible and blocks autoplay on any site. No tracking, no data collection.

### Description
(use the Chrome Web Store detailed description above)

---

## All_urls justification (for Chrome / Edge / Opera reviewers)

> This extension injects a content script to observe and modify HTML5 `<video>` elements on any page the user visits. Because HTML5 videos appear on an unbounded and constantly changing set of domains — including streaming services, news sites, social networks, educational platforms, and personal sites — a static list of `matches` patterns would be both incomplete and impossible to maintain. The `<all_urls>` permission is the minimum required to fulfil the extension's sole purpose. The content script reads no page content, accesses no user data, and makes no network requests. It only interacts with `HTMLVideoElement` instances within the page's existing JavaScript context.

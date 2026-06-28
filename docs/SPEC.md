# Etch — Product Spec (v1 MVP)

A mobile-first, client-side web app (PWA) for tracing reference images. Load an
image, view it edge-to-edge fullscreen, apply a "trace filter" that converts the
photo into traceable line art, then **lock** the screen so resting a hand, paper,
or stylus on the glass can't move it.

**Platform priority:** iPhone (iOS Safari, installed to Home Screen). Must also
work in a normal browser tab, but the chrome-free fullscreen experience requires
the PWA install path (see below).

**Privacy / hosting:** 100% client-side. No backend, no accounts, no uploads.
Images never leave the device. Static hosting (GitHub Pages / Netlify), free,
offline-capable.

---

## 1. Fullscreen & "no browser bar" (iPhone)

iOS Safari does **not** support the JS Fullscreen API for arbitrary elements.
The only reliable way to hide Safari's chrome is **Add to Home Screen (PWA)**.

- Web app manifest with `"display": "standalone"` (fallback `"fullscreen"`).
- `apple-mobile-web-app-capable` + `mobile-web-app-capable` meta tags.
- `viewport-fit=cover` + CSS `env(safe-area-inset-*)` so the image runs under
  the Dynamic Island / home bar instead of leaving black gutters.
- Custom app icon + splash screen.
- **Onboarding prompt:** first visit shows a friendly "Add to Home Screen for
  fullscreen tracing" card with the Share → Add to Home Screen steps. This is a
  **manual instruction card on iOS** — `beforeinstallprompt` is Android/Chromium
  only and never fires in Safari. (On Android we *can* use `beforeinstallprompt`
  for a one-tap install; treat that as progressive enhancement.)
- **Non-Safari iOS browsers:** Chrome/Firefox/Edge on iOS are all WebKit skins
  and **cannot** install a standalone, chrome-free PWA — only Safari's Add to
  Home Screen does. If opened in a non-Safari iOS browser (detect via UA:
  `CriOS`, `FxiOS`, `EdgiOS`…), show a banner: *"For fullscreen tracing, open in
  Safari and Add to Home Screen."* The app still runs there; it just can't hide
  the browser chrome.
- **Fallback (plain tab):** scroll 1px to collapse the URL bar; accept that it's
  imperfect and keep steering users to install.

## 2. Lock mode (the centerpiece)

Lock = freeze the image transform + swallow every canvas touch + hide controls.

- **One toggle** to lock/unlock.
- While locked: pan/zoom/rotate disabled; toolbar removed from hit-testing (not
  just visually hidden); image cannot move.
- **Obvious locked state:** lock glyph + subtle colored border tint, so a
  "dead" screen is explained.
- **Unlock requires a deliberate gesture** that won't fire by accident — e.g.
  two-finger long-press, or a small tap target tucked in a safe corner. A single
  tap must never unlock.
- **State-change confirmation:** on lock/unlock, give a clear **visual cue**
  (border tint + glyph) plus an optional **short audio tick**. NOTE: the
  Vibration API (`navigator.vibrate`) is **not supported in iOS Safari**, so true
  haptics are unavailable on the priority platform — wire `navigator.vibrate`
  only as Android progressive enhancement, never as the primary feedback.

### Input suppression (always, strongest while locked)
- `touch-action: none` on canvas → kills page pinch-zoom & double-tap-zoom.
- `overscroll-behavior: none` + `position: fixed` body → kills pull-to-refresh
  and rubber-band scroll.
- `user-select: none` + `-webkit-touch-callout: none` → kills text select /
  long-press callout.
- **iOS ignores `user-scalable=no`** (since iOS 10), so it is NOT sufficient.
  Must also `preventDefault()` on `gesturestart` / `gesturechange` and on
  multi-touch `touchmove` to block Safari's pinch-zoom of the page. Keep the
  viewport tag too as a hint for other browsers.
- Edge-swipe back/forward: can't fully block in a Safari tab; **standalone PWA
  mode disables it** — another reason to push the install.

## 3. View controls (when unlocked)

- Pan (1-finger drag), pinch-zoom, rotate (2-finger).
- **Quick reset:** one tap → fit-to-screen + filter off + rotation cleared.
- Keep transform smooth via CSS `transform` (GPU), reprocess filter from the
  original (see §4). **Tradeoff:** CSS-scaling the canvas means the filtered
  raster is fixed-resolution, so zooming in for fine lines softens it. Acceptable
  for v1; the fix (re-rendering the filter at the current zoom) is a later option.
- **Keep screen awake:** Wake Lock API (iOS 16.4+).
- Auto-hide toolbar after a few seconds idle, and always when locked. Big,
  thumb-reachable controls anchored above the home bar.

## 4. Trace filter

Converts the loaded image into a traceable rendering. Runs **fully on-device**
(WebGL shader preferred for real-time; Canvas `getImageData` fallback). The
original image is always kept in memory; all filtering is **non-destructive** and
reprocessed from the source on every parameter change.

**Global filter controls (apply to all modes):**
- **Pre-blur / denoise** slider — applied before edge detection so line art on a
  noisy photo doesn't turn to static.
- **Before/after toggle** — or an opacity blend between original and filtered,
  to check extracted lines against the real photo.
- All controls are **live sliders** — the workflow is dialing threshold until
  *just* the needed lines appear.

### Mode 1 — Line Art (edge detection) — **default**
Detect edges, render as clean dark lines on white.
- **Sobel** — fast, simple, a bit noisy.
- **XDoG (Extended Difference-of-Gaussians)** — sketch/hand-drawn look; the most
  artistic result. **Default algorithm.**
- **Canny** — crisp, thin, connected contours. **Stretch goal:** its hysteresis
  step (connected-edge tracking) is iterative and awkward on the GPU; since XDoG
  is the default and looks better, Canny ships only if it comes cheap. Not core.
- Controls: line **threshold** (detail retained), line **thickness**, **invert**
  (dark-on-white vs white-on-black).

### Mode 2 — Posterize / Value blocking
Reduce to flat tones for shadow/midtone/light shape blocking (notan study).
- Control: **levels** (2 / 3 / 4 / 5).

### Mode 3 — Threshold (high-contrast B&W)
Pure black & white at an adjustable cutoff. Bold, graphic, stencil-style.
- Control: **threshold** cutoff.

### Mode 4 — Adaptive / pencil-sketch
Local adaptive thresholding → soft pencil rendering that keeps texture. Middle
ground between full photo and pure line art.
- Control: block size / strength.

## 5. Tracing aids

- **Adjustable grid** — configurable N×N proportional grid (not just
  rule-of-thirds). Toggle + set divisions. Optional snap.
- **Mirror / flip on a timer** — periodically flip the reference to catch
  proportion errors. Manual flip H/V also available.
- **Crop / focus region** — zoom into and lock just one part of a busy reference.

## 6. Image input

- Photo library, file picker, paste from clipboard, drag-and-drop.
- **Share-sheet target** — manifest `share_target` is **Chromium/Android only**;
  iOS Safari ignores it, so "Share → Etch" does NOT work on the priority
  platform. Ship it as **Android progressive enhancement**; on iOS rely on the
  file picker / paste / drag paths above.

## 7. Persistence

- **Auto-restore current session** (image + transform + filter state) via
  IndexedDB. **Persist the source image as a `Blob`/`File`, not an `ImageBitmap`**
  (Safari has been buggy storing `ImageBitmap`); re-decode on restore. So a reload
  or app-switch doesn't lose placement.
- Storage is on-device only; note iOS may evict PWA storage when low on space —
  treat as best-effort.
- Named/multi-image library is **out of scope for v1** (deferred).

---

## Architecture

- **PWA**: web app manifest + service worker (offline + installability).
- **Rendering**: CSS `transform` on the displayed layer for pan/zoom/rotate;
  WebGL (or Canvas2D fallback) for the trace-filter pipeline.
- **Storage**: IndexedDB for image blobs + session state.
- **Stack**: React 18 + TypeScript + Zustand, Vite, vite-plugin-pwa. No backend.
  See [PLAN.md](PLAN.md) for the full stack and milestones.
- **Core APIs** (work in iOS Safari): Web App Manifest, Service Worker, Wake Lock
  (16.4+), Pointer Events, Clipboard, IndexedDB, WebGL2.
- **Android-only progressive enhancements** (absent in iOS Safari/WebKit):
  Vibration, Web Share Target, `beforeinstallprompt`. Must degrade gracefully.

## Explicitly deferred (post-v1)
Live camera trace · gesture-drawing timer · onion-skin / dual reference ·
color sampler / eyedropper · background tint · dim-the-rest vignette ·
named multi-image library · orientation lock.

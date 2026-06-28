# Trace — Product Spec (v1 MVP)

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
  fullscreen tracing" card with the Share → Add to Home Screen steps.
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
- **Haptic tick** on lock and unlock (Vibration API where supported) so the
  state change is felt without looking.

### Input suppression (always, strongest while locked)
- `touch-action: none` on canvas → kills page pinch-zoom & double-tap-zoom.
- `overscroll-behavior: none` + `position: fixed` body → kills pull-to-refresh
  and rubber-band scroll.
- `user-select: none` + `-webkit-touch-callout: none` → kills text select /
  long-press callout.
- `user-scalable=no` in viewport.
- Edge-swipe back/forward: can't fully block in a Safari tab; **standalone PWA
  mode disables it** — another reason to push the install.

## 3. View controls (when unlocked)

- Pan (1-finger drag), pinch-zoom, rotate (2-finger).
- **Quick reset:** one tap → fit-to-screen + filter off + rotation cleared.
- Keep transform smooth via CSS `transform` (GPU), reprocess filter from the
  original (see §4).
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
- **Canny** — crisp, thin, connected contours; closest to a real line drawing.
- **XDoG (Extended Difference-of-Gaussians)** — sketch/hand-drawn look; the most
  artistic result. **Default algorithm.**
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

- Photo library, file picker, paste from clipboard.
- **Share-sheet target** — "Share → Trace" straight from Photos/Safari via the
  manifest `share_target`.

## 7. Persistence

- **Auto-restore current session** (image + transform + filter state) via
  IndexedDB, so a reload or app-switch doesn't lose placement.
- Storage is on-device only; note iOS may evict PWA storage when low on space —
  treat as best-effort.
- Named/multi-image library is **out of scope for v1** (deferred).

---

## Architecture

- **PWA**: web app manifest + service worker (offline + installability).
- **Rendering**: CSS `transform` on the displayed layer for pan/zoom/rotate;
  WebGL (or Canvas2D fallback) for the trace-filter pipeline.
- **Storage**: IndexedDB for image blobs + session state.
- **Stack**: lightweight — vanilla JS or small React. No backend.
- **APIs used**: Web App Manifest, Service Worker, Wake Lock, Pointer Events,
  Vibration, Clipboard, Web Share Target, IndexedDB, Canvas/WebGL.

## Explicitly deferred (post-v1)
Live camera trace · gesture-drawing timer · onion-skin / dual reference ·
color sampler / eyedropper · background tint · dim-the-rest vignette ·
named multi-image library · orientation lock.

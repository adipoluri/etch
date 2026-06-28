# Etch — Implementation Plan (v1 MVP)

Companion to [SPEC.md](SPEC.md). This is the build plan: stack, architecture,
data model, the filter pipeline, and a phased milestone breakdown.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Build / dev | **Vite + TypeScript** |
| UI framework | **React 18** |
| State | **Zustand** (one small store) |
| PWA | **vite-plugin-pwa** (Workbox: manifest + service worker, offline) |
| Filter engine | **WebGL2 + custom GLSL**, **twgl** for FBO/program boilerplate |
| Gestures | **@use-gesture/react** (pan / pinch / rotate) |
| Storage | **idb** (IndexedDB wrapper) for session auto-restore |
| Styling | **Plain CSS + custom properties**, safe-area insets |
| Lint/format | ESLint + Prettier |
| Test | **Vitest** for `gl/` math + `lib/` helpers (filter pipeline especially) |
| Deploy | **GitHub Pages** via GitHub Actions (HTTPS required for PWA/iOS) |

Constraints driving these: 100% client-side, mobile-first, real-time filtering,
offline. WebGL2 (not WebGPU) for iOS support; React because chosen for
familiarity; everything else picked to stay lean on mobile.

---

## 2. Project structure

```
etch/
├── index.html
├── vite.config.ts            # Vite + vite-plugin-pwa config
├── public/
│   ├── icons/                # PWA icons (192, 512, maskable, apple-touch)
│   └── apple-splash/         # iOS splash screens
├── src/
│   ├── main.tsx
│   ├── App.tsx               # layout, wires viewer + toolbar + modals
│   ├── store/
│   │   └── useEtchStore.ts   # Zustand: image, transform, filter, lock, ui
│   ├── gl/                   # framework-agnostic filter engine
│   │   ├── Renderer.ts       # WebGL2 context, ping-pong FBOs, draw loop
│   │   ├── pipeline.ts       # builds pass list from filter state
│   │   ├── passes/           # one module per pass
│   │   │   ├── blur.ts
│   │   │   ├── sobel.ts
│   │   │   ├── canny.ts
│   │   │   ├── xdog.ts
│   │   │   ├── posterize.ts
│   │   │   ├── threshold.ts
│   │   │   └── adaptive.ts
│   │   └── shaders/          # .glsl (or .ts string) per pass
│   ├── components/
│   │   ├── Viewer.tsx        # canvas + gesture surface + transform
│   │   ├── Toolbar.tsx       # auto-hiding controls
│   │   ├── FilterPanel.tsx   # mode tabs + sliders
│   │   ├── GridOverlay.tsx
│   │   ├── LockButton.tsx
│   │   ├── InstallPrompt.tsx # Add-to-Home-Screen onboarding
│   │   └── ImageInput.tsx    # file / paste / share-target intake
│   ├── hooks/
│   │   ├── useWakeLock.ts
│   │   ├── useGestures.ts    # @use-gesture → transform (disabled when locked)
│   │   ├── useAutoHide.ts
│   │   └── useHaptics.ts
│   ├── lib/
│   │   ├── db.ts             # idb: save/load session
│   │   ├── share.ts          # Web Share Target handler
│   │   └── image.ts          # decode/load helpers
│   └── styles/
│       └── global.css
└── docs/
```

**Key boundary:** `src/gl/*` is plain TypeScript with zero React imports. The
filter engine takes an input texture + filter params and renders to a canvas.
React only feeds it state and owns the DOM/UI. This keeps the risky part testable
and replaceable.

---

## 3. State model (Zustand)

```ts
interface EtchState {
  // source — keep both: blob is the source of truth (persisted to IndexedDB,
  // since Safari is buggy storing ImageBitmap); bitmap is the decoded runtime copy.
  image: { blob: Blob; bitmap: ImageBitmap; width: number; height: number } | null;

  // view transform (CSS transform on the canvas layer)
  transform: { x: number; y: number; scale: number; rotation: number };

  // filter (non-destructive; engine reprocesses from original on change)
  filter: {
    mode: 'none' | 'lineart' | 'posterize' | 'threshold' | 'adaptive';
    lineart: { algo: 'sobel' | 'canny' | 'xdog'; threshold: number;
               thickness: number; invert: boolean };
    posterize: { levels: 2 | 3 | 4 | 5 };
    threshold: { cutoff: number };
    adaptive: { blockSize: number; strength: number };
    preBlur: number;        // global denoise
    blend: number;          // 0 = original, 1 = filtered (before/after)
  };

  // tools
  grid: { on: boolean; divisions: number; snap: boolean };
  flipTimer: { on: boolean; intervalSec: number };
  flip: { h: boolean; v: boolean };

  // app
  locked: boolean;
  ui: { controlsVisible: boolean };

  // actions: setImage, setTransform, setFilter…, toggleLock, reset, …
}
```

Transform lives in the store but is applied as a **CSS transform** on the canvas
element (cheap, GPU). Filter params trigger a **re-render of the WebGL pipeline**
from the cached source texture — never re-uploading the image. *Tradeoff:* the
canvas renders at a fixed resolution, so CSS-scaling it up softens fine lines at
high zoom — acceptable for v1; re-rendering at zoom level is a later option.

---

## 4. Filter pipeline (the high-risk piece)

A multi-pass WebGL2 chain with **ping-pong framebuffers**. Source image is
uploaded **once** to a texture; every slider change just re-runs passes.

```
source texture
  → [pre-blur]            (gaussian, separable H+V; skipped if 0)
  → grayscale/luminance   (for edge & value modes)
  → mode pass(es):
       lineart:  sobel | canny(multi-pass) | xdog
       posterize: quantize luminance to N levels
       threshold: step(cutoff)
       adaptive:  local mean → compare
  → [invert]              (lineart only)
  → blend with original   (before/after slider)
  → present to canvas
```

Implementation notes:
- **twgl** for program compilation, FBO creation, ping-pong helper, fullscreen
  quad. Custom GLSL for each pass.
- **Separable blurs** (two 1D passes) for Gaussian/DoG — far cheaper than 2D.
- **XDoG** = two Gaussian blurs → difference → thresholding curve. Default mode.
  Expose `threshold` (its ε/φ feel) and `thickness` (σ) via the two UI sliders.
- **Canny is a STRETCH goal, not core.** Its hysteresis step (connected-edge
  tracking) is iterative/recursive — awkward and expensive on the GPU (needs
  multiple ping-pong iterations or an approximation). Build Sobel + XDoG first;
  ship Canny only if it comes cheap. XDoG is the default and looks better anyway.
- **Performance guard:** cap working resolution (e.g. longest edge ~2048px) and
  optionally render at reduced res while a slider is actively dragging, then
  settle to full res. Use `requestAnimationFrame`, render only on change.
- **Fallback:** if WebGL2 unavailable, show a notice; a Canvas2D path is a
  possible future fallback but out of scope for v1.

This piece should be **prototyped standalone first** (Phase 2) against a static
image before wiring any UI.

---

## 5. iOS / PWA specifics

- `vite-plugin-pwa` generates manifest + SW. Manifest: `display: standalone`.
  `share_target` is **Android/Chromium only** (iOS ignores it) — include it as
  progressive enhancement; the SW must handle its POST since the host is static.
- Add `apple-mobile-web-app-capable`, `apple-touch-icon`, apple splash screens,
  `viewport-fit=cover`.
- **Gesture-zoom blocking:** `user-scalable=no` is **ignored by iOS Safari**.
  Keep the viewport tag, but ALSO `preventDefault()` on `gesturestart` /
  `gesturechange` and multi-touch `touchmove` to actually stop page pinch-zoom.
- Global CSS: `position: fixed` body, `overscroll-behavior: none`,
  `touch-action: none` on the viewer, `user-select/-webkit-touch-callout: none`,
  `env(safe-area-inset-*)` padding on toolbars.
- `InstallPrompt`: on iOS show the **manual** Add-to-Home-Screen guide only in a
  plain Safari tab (detect via `navigator.standalone` / `display-mode:
  standalone`). `beforeinstallprompt` does NOT fire in Safari — use it only on
  Android for one-tap install.
- **Non-Safari iOS browsers** (Chrome `CriOS`, Firefox `FxiOS`, Edge `EdgiOS`):
  all WebKit, **cannot install a standalone PWA**. Detect via UA and show a
  "open in Safari to install" banner. App still runs, just with browser chrome.
- **No haptics on iOS:** `navigator.vibrate` is unsupported in iOS Safari. Use
  visual (border tint + glyph) + optional short audio tick for lock feedback;
  wire `navigator.vibrate` only as Android progressive enhancement.
- Wake Lock via `navigator.wakeLock` (iOS 16.4+); re-acquire on
  `visibilitychange`.

---

## 6. Milestones

Each milestone is independently shippable/testable.

**M0 — Scaffold** *(half day)*
Vite + React + TS, ESLint/Prettier, Zustand store skeleton, base CSS reset with
mobile lockdown rules, deploy a "hello" build to GitHub Pages via Actions.
→ *Verify CI deploy + HTTPS load on iPhone.*

**M1 — Viewer + image input** *(1 day)*
Load image (file/picker/paste), display on canvas, pan/pinch/rotate via
@use-gesture, fit-to-screen, quick reset. No filter yet.
→ *Verify smooth gestures on iPhone.*

**M2 — Lock mode + mobile lockdown** *(1 day)*
Lock toggle freezes transform & swallows touches, locked indicator (visual +
optional audio cue; vibrate as Android-only enhancement), deliberate unlock
gesture, auto-hide toolbar, all input-suppression CSS **+ the iOS
`gesturestart`/`gesturechange`/`touchmove` preventDefault guard**.
→ *Verify hand-on-glass doesn't move image, and page can't pinch-zoom, on iPhone.*

**M3 — Filter engine (standalone)** *(2–3 days, highest risk)*
WebGL2 renderer + ping-pong FBOs, pre-blur, **XDoG** + **Sobel** first, then
Posterize, Threshold, Adaptive. **Canny only if cheap (stretch).** Tested against
a static image in a dev harness before UI; add Vitest for the GLSL-feeding math.
→ *Verify each mode looks good + holds frame rate on a real photo.*

**M4 — Filter UI + integration** *(1–2 days)*
FilterPanel: mode tabs + live sliders, before/after blend, wired to the engine
via the store. Performance guard (reduced-res-while-dragging).
→ *Verify live slider dragging stays responsive on iPhone.*

**M5 — Tracing aids** *(1 day)*
Adjustable N×N grid overlay, manual flip H/V, flip-on-timer, crop/focus region.

**M6 — PWA polish** *(1–2 days)*
Manifest, icons, splash, service worker/offline, safe-area pass, wake lock,
session auto-restore via idb (**persist source `Blob`, re-decode on restore**),
install onboarding (**manual A2HS card on iOS**; `beforeinstallprompt` on
Android), **non-Safari-iOS "open in Safari" banner**, and `share_target` as an
**Android-only** enhancement.
→ *Verify Safari install-to-Home-Screen → launches chrome-free + offline + restores.*

**M7 — QA & ship** *(1 day)*
Cross-device pass (iPhone primary, Android/desktop sanity), real tracing
session, fix the rough edges.

*Rough total: ~10–13 focused days. M3 is the swing factor.*

---

## 7. Open questions / decisions to revisit
- Canny — stretch only; decide in M3 whether GPU hysteresis is worth it at all.
- Crop/focus region UX — separate mode vs. just locking a zoomed view.
- Exact slider ranges per filter param — tune empirically in M3/M4.
- GitHub Pages base path (`/etch/`) vs. custom domain — affects PWA scope/SW.
- High-zoom sharpness — if CSS-scaled softness is too much, add re-render-at-zoom.

## 8. Platform reality (iOS) — load-bearing constraints
iPhone is the priority platform, and on iOS **all browsers are WebKit** (Chrome/
Firefox/Edge are skins). Consequences baked into the plan above:
- **Standalone fullscreen only via Safari → Add to Home Screen.** Other iOS
  browsers can't install a chrome-free PWA → "open in Safari" banner.
- **Unsupported in iOS Safari, so Android-only progressive enhancements:**
  Vibration (haptics), Web Share Target, `beforeinstallprompt`.
- **`user-scalable=no` is ignored** → JS `preventDefault` on gesture/touch events.
- **Persist `Blob` not `ImageBitmap`** in IndexedDB (Safari bugs).
- Wake Lock requires iOS **16.4+**.

// Platform detection for the PWA install flow. On iOS every browser is WebKit,
// but only Safari can install a standalone (chrome-free) PWA — see SPEC §1.

const ua = navigator.userAgent

export const isIOS =
  /iphone|ipad|ipod/i.test(ua) ||
  // iPadOS 13+ reports as Mac; detect via touch.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Non-Safari iOS browsers (Chrome/Firefox/Edge) — can't install a standalone PWA. */
export const isIOSNonSafari =
  isIOS && /CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua)

export const isAndroid = /android/i.test(ua)

/** Running as an installed standalone app (no browser chrome). */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS-specific flag
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

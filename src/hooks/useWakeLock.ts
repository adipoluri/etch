import { useEffect } from 'react'

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void> }

/** Keep the screen awake while `active` (e.g. an image is loaded and you're
 *  tracing). Re-acquires after the tab returns to the foreground, since iOS
 *  releases the lock on visibility change. (Wake Lock API: iOS Safari 16.4+.) */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock
    if (!wl) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        sentinel = await wl.request('screen')
      } catch {
        /* user gesture may be required, or unsupported — ignore */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}

import { useEffect } from 'react'

/** Block Safari's page pinch-zoom and double-tap-zoom. iOS ignores
 *  `user-scalable=no`, so these must be prevented in JS. The non-standard
 *  `gesture*` events are Safari's pinch pipeline and are separate from the
 *  Pointer Events @use-gesture uses, so blocking them doesn't break the viewer. */
export function useIOSGestureGuard() {
  useEffect(() => {
    const prevent: EventListener = (e) => e.preventDefault()
    const opts: AddEventListenerOptions = { passive: false }
    const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend']
    gestureEvents.forEach((name) =>
      document.addEventListener(name, prevent, opts),
    )

    // Double-tap-to-zoom guard.
    let lastTouchEnd = 0
    const onTouchEnd: EventListener = (e) => {
      const now = e.timeStamp
      if (now - lastTouchEnd < 300) e.preventDefault()
      lastTouchEnd = now
    }
    document.addEventListener('touchend', onTouchEnd, opts)

    return () => {
      gestureEvents.forEach((name) =>
        document.removeEventListener(name, prevent, opts),
      )
      document.removeEventListener('touchend', onTouchEnd, opts)
    }
  }, [])
}

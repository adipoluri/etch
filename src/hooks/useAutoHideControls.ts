import { useEffect } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'

/** Show controls on any user activity, hide them after a period of stillness.
 *  Keeps the tracing surface clean without losing access to the controls. */
export function useAutoHideControls(delayMs = 3500) {
  const setControlsVisible = useEtchStore((s) => s.setControlsVisible)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const bump = () => {
      setControlsVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setControlsVisible(false), delayMs)
    }
    bump()
    const events = ['pointerdown', 'pointermove', 'keydown']
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [delayMs, setControlsVisible])
}

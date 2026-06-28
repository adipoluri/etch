import { useEffect } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'

/** When the auto-flip timer is on, mirror the image horizontally at the chosen
 *  interval — a common trick for catching proportion errors while drawing. */
export function useFlipTimer() {
  const on = useEtchStore((s) => s.flipTimer.on)
  const intervalSec = useEtchStore((s) => s.flipTimer.intervalSec)

  useEffect(() => {
    if (!on) return
    const id = setInterval(() => {
      const { flip, setFlip } = useEtchStore.getState()
      setFlip({ h: !flip.h })
    }, intervalSec * 1000)
    return () => clearInterval(id)
  }, [on, intervalSec])
}

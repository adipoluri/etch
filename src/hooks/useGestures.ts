import { useGesture } from '@use-gesture/react'
import type { RefObject } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'

const SCALE_MIN = 0.05
const SCALE_MAX = 20

/** Wire pan (1-finger drag), pinch-zoom, and 2-finger rotate to the store,
 *  applied to `target`. Disabled while locked. Reads transform fresh from the
 *  store at gesture start to avoid stale closures. */
export function useGestures(target: RefObject<HTMLElement>) {
  const locked = useEtchStore((s) => s.locked)
  const cropping = useEtchStore((s) => s.cropping)
  const setTransform = useEtchStore((s) => s.setTransform)

  useGesture(
    {
      onDrag: ({ offset: [x, y] }) => setTransform({ x, y }),
      onPinch: ({ offset: [scale, rotation] }) =>
        setTransform({ scale, rotation }),
    },
    {
      target,
      enabled: !locked && !cropping,
      eventOptions: { passive: false },
      drag: {
        from: () => {
          const { x, y } = useEtchStore.getState().transform
          return [x, y]
        },
        filterTaps: true,
      },
      pinch: {
        from: () => {
          const { scale, rotation } = useEtchStore.getState().transform
          return [scale, rotation]
        },
        scaleBounds: { min: SCALE_MIN, max: SCALE_MAX },
        rubberband: true,
      },
    },
  )
}

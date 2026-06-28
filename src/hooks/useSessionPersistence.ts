import { useEffect, useRef } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import { loadImageFromBlob } from '../lib/image.ts'
import { saveSession, loadSession, clearSession } from '../lib/db.ts'

/** Auto-restore the last session on startup and persist changes (debounced).
 *  Persists the source blob + filter/aids; the view re-fits on restore. */
export function useSessionPersistence() {
  const restoredRef = useRef(false)

  // Restore once on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const saved = await loadSession()
      if (cancelled || !saved) {
        restoredRef.current = true
        return
      }
      try {
        const image = await loadImageFromBlob(saved.blob)
        if (cancelled) return
        const st = useEtchStore.getState()
        st.setImage(image)
        st.setFilter(saved.filter)
        st.setFlip(saved.flip)
        st.setGrid(saved.grid)
        st.setFlipTimer(saved.flipTimer)
      } catch {
        await clearSession()
      } finally {
        restoredRef.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist relevant slices on change (debounced), but not before restore runs.
  const image = useEtchStore((s) => s.image)
  const filter = useEtchStore((s) => s.filter)
  const flip = useEtchStore((s) => s.flip)
  const grid = useEtchStore((s) => s.grid)
  const flipTimer = useEtchStore((s) => s.flipTimer)

  useEffect(() => {
    if (!restoredRef.current) return
    if (!image) {
      void clearSession()
      return
    }
    const id = setTimeout(() => {
      void saveSession({ blob: image.blob, filter, flip, grid, flipTimer })
    }, 600)
    return () => clearTimeout(id)
  }, [image, filter, flip, grid, flipTimer])
}

import { useCallback } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import { loadImageFromBlob, ImageLoadError } from '../lib/image.ts'

/** Returns a callback that decodes a Blob/File and loads it as the active image.
 *  Surfaces failures through the store's transient notice. */
export function useImageLoader() {
  const setImage = useEtchStore((s) => s.setImage)
  const setNotice = useEtchStore((s) => s.setNotice)

  return useCallback(
    async (blob: Blob) => {
      try {
        setImage(await loadImageFromBlob(blob))
      } catch (err) {
        console.error('Failed to load image', err)
        setNotice(
          err instanceof ImageLoadError
            ? err.message
            : "Couldn't load that file — is it an image?",
        )
      }
    },
    [setImage, setNotice],
  )
}

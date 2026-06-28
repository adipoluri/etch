import { useCallback } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import { loadImageFromBlob } from '../lib/image.ts'

/** Returns a callback that decodes a Blob/File and loads it as the active image. */
export function useImageLoader() {
  const setImage = useEtchStore((s) => s.setImage)
  return useCallback(
    async (blob: Blob) => {
      try {
        setImage(await loadImageFromBlob(blob))
      } catch (err) {
        console.error('Failed to load image', err)
        alert("Couldn't load that file — is it an image?")
      }
    },
    [setImage],
  )
}

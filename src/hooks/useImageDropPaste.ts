import { useEffect } from 'react'
import { useImageLoader } from './useImageLoader.ts'
import { imageFromDataTransfer } from '../lib/image.ts'

/** Global drag-and-drop and clipboard-paste image intake (desktop / iPad). */
export function useImageDropPaste() {
  const load = useImageLoader()

  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      const file = imageFromDataTransfer(e.dataTransfer)
      if (file) {
        e.preventDefault()
        void load(file)
      }
    }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromDataTransfer(e.clipboardData)
      if (file) {
        e.preventDefault()
        void load(file)
      }
    }

    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('paste', onPaste)
    }
  }, [load])
}

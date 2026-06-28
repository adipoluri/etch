import type { SourceImage } from '../store/useEtchStore.ts'

const ACCEPTED = /^image\//

/** Decode a Blob/File into a SourceImage, respecting EXIF orientation so photos
 *  shot on a phone aren't rotated wrong. Keeps the original blob for persistence. */
export async function loadImageFromBlob(blob: Blob): Promise<SourceImage> {
  if (!ACCEPTED.test(blob.type)) {
    throw new Error(`Unsupported file type: ${blob.type || 'unknown'}`)
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    // Older engines may not support the options bag.
    bitmap = await createImageBitmap(blob)
  }

  return { blob, bitmap, width: bitmap.width, height: bitmap.height }
}

/** Pull the first image out of a clipboard/drag DataTransfer, if any. */
export function imageFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null
  for (const item of dt.files) {
    if (ACCEPTED.test(item.type)) return item
  }
  return null
}

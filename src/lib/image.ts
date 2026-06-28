import type { SourceImage } from '../store/useEtchStore.ts'

/** Thrown when a file can't be decoded as an image; message is user-facing. */
export class ImageLoadError extends Error {}

/** Decode a Blob/File into a SourceImage, respecting EXIF orientation so photos
 *  shot on a phone aren't rotated wrong. Keeps the original blob for persistence.
 *
 *  We attempt to decode first rather than trusting the MIME type: iOS often hands
 *  over camera-roll files (esp. HEIC) with an empty or unexpected `type`. */
export async function loadImageFromBlob(blob: Blob): Promise<SourceImage> {
  let bitmap: ImageBitmap | null = null

  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    // Older engines may not support the options bag — retry without it.
    try {
      bitmap = await createImageBitmap(blob)
    } catch {
      bitmap = null
    }
  }

  // Fallback path: some engines can't createImageBitmap from HEIC but CAN render
  // it via an <img> (Safari decodes HEIC natively). Try that before giving up.
  if (!bitmap) {
    bitmap = await decodeViaImageElement(blob)
  }

  if (!bitmap) {
    throw new ImageLoadError(
      "Couldn't open that image. iPhone HEIC photos sometimes fail — try a " +
        'screenshot, or set Camera → Formats to "Most Compatible".',
    )
  }

  return { blob, bitmap, width: bitmap.width, height: bitmap.height }
}

/** Decode via a hidden <img> + object URL, then rasterize to an ImageBitmap. */
async function decodeViaImageElement(blob: Blob): Promise<ImageBitmap | null> {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    if (!img.naturalWidth) return null
    return await createImageBitmap(img)
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Pull the first usable image out of a clipboard/drag DataTransfer, if any.
 *  Accepts empty-typed files too (iOS HEIC) as a fallback. */
export function imageFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null
  const files = Array.from(dt.files)
  return (
    files.find((f) => f.type.startsWith('image/')) ??
    files.find((f) => f.type === '' && /\.(heic|heif|jpe?g|png|webp|gif|bmp|tiff?)$/i.test(f.name)) ??
    null
  )
}

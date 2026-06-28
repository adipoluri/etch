import type { SourceImage } from '../store/useEtchStore.ts'

/** Thrown when a file can't be decoded as an image; message is user-facing. */
export class ImageLoadError extends Error {}

/** Decode a Blob/File into a SourceImage, respecting EXIF orientation so photos
 *  shot on a phone aren't rotated wrong. Keeps the original blob for persistence.
 *
 *  We attempt to decode first rather than trusting the MIME type: iOS often hands
 *  over camera-roll files (esp. HEIC) with an empty or unexpected `type`. */
export async function loadImageFromBlob(blob: Blob): Promise<SourceImage> {
  let drawable: ImageBitmap | HTMLCanvasElement | null = null

  // Fast path: createImageBitmap. It's flaky in iOS standalone WebViews, so a
  // failure here is expected on iOS and we fall through to the <img> path.
  try {
    drawable = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    try {
      drawable = await createImageBitmap(blob)
    } catch {
      drawable = null
    }
  }

  // Robust fallback: decode via a real <img> (which respects EXIF orientation by
  // default) and rasterize onto a <canvas> — no createImageBitmap involved. This
  // is the reliable path on iOS and also handles HEIC (Safari decodes natively).
  if (!drawable) {
    drawable = await decodeToCanvas(blob)
  }

  if (!drawable) {
    throw new ImageLoadError(
      "Couldn't open that image. If it's an iPhone HEIC photo, try a screenshot " +
        'or set Camera → Formats to "Most Compatible".',
    )
  }

  return {
    blob,
    bitmap: drawable,
    width: drawable.width,
    height: drawable.height,
  }
}

/** Decode via a hidden <img> + object URL, then draw onto a canvas. Avoids
 *  createImageBitmap entirely (which is unreliable on iOS). */
async function decodeToCanvas(blob: Blob): Promise<HTMLCanvasElement | null> {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas
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

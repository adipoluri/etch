import * as twgl from 'twgl.js'
import type { FilterState } from '../store/useEtchStore.ts'
import {
  VERT,
  FRAG_BLUR,
  FRAG_LUM,
  FRAG_SOBEL,
  FRAG_XDOG,
  FRAG_POSTERIZE,
  FRAG_THRESHOLD,
  FRAG_ADAPTIVE,
  FRAG_PRESENT,
} from './shaders.ts'

const DEFAULT_MAX_SIZE = 2048

type FB = twgl.FramebufferInfo
const texOf = (fb: FB) => fb.attachments[0] as WebGLTexture

/** Framework-agnostic WebGL2 trace-filter engine. Upload a source bitmap once,
 *  then call render(filter) on every parameter change — passes re-run from the
 *  cached source texture; the image is never re-uploaded. */
export class FilterRenderer {
  readonly gl: WebGL2RenderingContext
  private maxSize: number
  private w = 0
  private h = 0
  private srcImage: ImageBitmap | HTMLCanvasElement | null = null
  private srcTex: WebGLTexture | null = null
  private quad: twgl.BufferInfo
  private prog: Record<string, twgl.ProgramInfo>
  private fb!: Record<'tmp' | 'pb' | 'lum' | 'a' | 'b' | 'out', FB>

  constructor(canvas: HTMLCanvasElement, maxSize = DEFAULT_MAX_SIZE) {
    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    })
    if (!gl) throw new Error('WebGL2 is not available')
    this.gl = gl
    this.maxSize = maxSize

    this.quad = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, 1, 1] },
    })
    this.prog = {
      blur: twgl.createProgramInfo(gl, [VERT, FRAG_BLUR]),
      lum: twgl.createProgramInfo(gl, [VERT, FRAG_LUM]),
      sobel: twgl.createProgramInfo(gl, [VERT, FRAG_SOBEL]),
      xdog: twgl.createProgramInfo(gl, [VERT, FRAG_XDOG]),
      posterize: twgl.createProgramInfo(gl, [VERT, FRAG_POSTERIZE]),
      threshold: twgl.createProgramInfo(gl, [VERT, FRAG_THRESHOLD]),
      adaptive: twgl.createProgramInfo(gl, [VERT, FRAG_ADAPTIVE]),
      present: twgl.createProgramInfo(gl, [VERT, FRAG_PRESENT]),
    }
  }

  /** Working pixel size after the resolution cap. */
  get size() {
    return { w: this.w, h: this.h }
  }

  /** Upload (and resolution-cap) the source image, (re)allocate framebuffers. */
  setSource(bitmap: ImageBitmap | HTMLCanvasElement) {
    this.srcImage = bitmap
    this.upload(bitmap)
  }

  /** Change the working-resolution cap and re-upload the current source. Used by
   *  the performance guard to drop to a cheaper resolution while sliders drag. */
  setMaxSize(maxSize: number) {
    if (maxSize === this.maxSize) return
    this.maxSize = maxSize
    if (this.srcImage) this.upload(this.srcImage)
  }

  private upload(bitmap: ImageBitmap | HTMLCanvasElement) {
    const gl = this.gl
    const sw = 'width' in bitmap ? bitmap.width : 0
    const sh = 'height' in bitmap ? bitmap.height : 0
    const scale = Math.min(1, this.maxSize / Math.max(sw, sh))
    this.w = Math.max(1, Math.round(sw * scale))
    this.h = Math.max(1, Math.round(sh * scale))

    // Draw to a sized 2D canvas so the upload is already resolution-capped.
    const tmp = document.createElement('canvas')
    tmp.width = this.w
    tmp.height = this.h
    tmp.getContext('2d')!.drawImage(bitmap, 0, 0, this.w, this.h)

    if (this.srcTex) gl.deleteTexture(this.srcTex)
    this.srcTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.canvas.width = this.w
    gl.canvas.height = this.h
    this.allocFramebuffers()
  }

  private allocFramebuffers() {
    const gl = this.gl
    if (this.fb) Object.values(this.fb).forEach((f) => this.freeFb(f))
    const make = () =>
      twgl.createFramebufferInfo(
        gl,
        [
          {
            internalFormat: gl.RGBA8,
            min: gl.LINEAR,
            mag: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
          },
        ],
        this.w,
        this.h,
      )
    this.fb = {
      tmp: make(),
      pb: make(),
      lum: make(),
      a: make(),
      b: make(),
      out: make(),
    }
  }

  private freeFb(f: FB) {
    const gl = this.gl
    gl.deleteFramebuffer(f.framebuffer)
    f.attachments.forEach((a) => {
      if (a instanceof WebGLTexture) gl.deleteTexture(a)
    })
  }

  private draw(
    pi: twgl.ProgramInfo,
    uniforms: Record<string, unknown>,
    target: FB | null,
  ) {
    const gl = this.gl
    twgl.bindFramebufferInfo(gl, target)
    gl.useProgram(pi.program)
    twgl.setBuffersAndAttributes(gl, pi, this.quad)
    twgl.setUniforms(pi, uniforms)
    twgl.drawBufferInfo(gl, this.quad, gl.TRIANGLE_STRIP)
  }

  private texel(): [number, number] {
    return [1 / this.w, 1 / this.h]
  }

  /** Separable Gaussian blur: src → tmp (H) → out (V). */
  private blur(src: WebGLTexture, sigma: number, out: FB) {
    const texel = this.texel()
    this.draw(
      this.prog.blur,
      { uTex: src, uTexel: texel, uDir: [1, 0], uSigma: sigma },
      this.fb.tmp,
    )
    this.draw(
      this.prog.blur,
      { uTex: texOf(this.fb.tmp), uTexel: texel, uDir: [0, 1], uSigma: sigma },
      out,
    )
  }

  /** Run the full pipeline for the given filter and present to the canvas. */
  render(filter: FilterState) {
    const gl = this.gl
    if (!this.srcTex) return
    const texel = this.texel()

    // 1. Optional pre-blur (denoise) on the source color.
    let work = this.srcTex
    if (filter.preBlur > 0) {
      this.blur(this.srcTex, filter.preBlur, this.fb.pb)
      work = texOf(this.fb.pb)
    }

    // 2. Luminance — the common grayscale input for every mode.
    this.draw(this.prog.lum, { uTex: work }, this.fb.lum)
    const L = texOf(this.fb.lum)

    // 3. Mode pass(es) → fb.out (filtered grayscale). Default (none) = source.
    let filtered: WebGLTexture = this.srcTex
    switch (filter.mode) {
      case 'lineart': {
        const invert = filter.lineart.invert ? 1 : 0
        if (filter.lineart.algo === 'xdog' || filter.lineart.algo === 'canny') {
          // Canny is a stretch goal; fall back to XDoG for now.
          const sigma = Math.max(0.3, filter.lineart.thickness * 1.2)
          const eps = (filter.lineart.threshold - 0.5) * 0.1
          this.blur(L, sigma, this.fb.a)
          this.blur(L, sigma * 1.6, this.fb.b)
          this.draw(
            this.prog.xdog,
            {
              uG1: texOf(this.fb.a),
              uG2: texOf(this.fb.b),
              uTau: 0.98,
              uEps: eps,
              uPhi: 200.0,
              uInvert: invert,
            },
            this.fb.out,
          )
        } else {
          this.draw(
            this.prog.sobel,
            {
              uTex: L,
              uTexel: texel,
              uThreshold: 0.05 + filter.lineart.threshold * 0.95,
              uThickness: Math.max(0.5, filter.lineart.thickness),
              uInvert: invert,
            },
            this.fb.out,
          )
        }
        filtered = texOf(this.fb.out)
        break
      }
      case 'posterize': {
        this.draw(
          this.prog.posterize,
          { uTex: L, uLevels: filter.posterize.levels },
          this.fb.out,
        )
        filtered = texOf(this.fb.out)
        break
      }
      case 'threshold': {
        this.draw(
          this.prog.threshold,
          { uTex: L, uCutoff: filter.threshold.cutoff },
          this.fb.out,
        )
        filtered = texOf(this.fb.out)
        break
      }
      case 'adaptive': {
        const sigma = Math.max(1, filter.adaptive.blockSize / 3)
        this.blur(L, sigma, this.fb.a)
        this.draw(
          this.prog.adaptive,
          {
            uTex: L,
            uMean: texOf(this.fb.a),
            uStrength: Math.max(0.02, filter.adaptive.strength * 0.5),
          },
          this.fb.out,
        )
        filtered = texOf(this.fb.out)
        break
      }
      case 'none':
      default:
        filtered = this.srcTex
        break
    }

    // 4. Present: blend original color with the filtered result, flip for display.
    const blend = filter.mode === 'none' ? 0 : filter.blend
    this.draw(
      this.prog.present,
      { uOrig: this.srcTex, uFiltered: filtered, uBlend: blend, uFlipY: 1 },
      null,
    )
    gl.flush()
  }

  dispose() {
    const gl = this.gl
    if (this.srcTex) gl.deleteTexture(this.srcTex)
    if (this.fb) Object.values(this.fb).forEach((f) => this.freeFb(f))
  }
}

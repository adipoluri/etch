import { create } from 'zustand'

/** Decoded source image. `blob` is the source of truth (persisted to IndexedDB,
 *  since Safari is buggy storing ImageBitmap); `bitmap` is the runtime copy. */
export interface SourceImage {
  blob: Blob
  bitmap: ImageBitmap
  width: number
  height: number
}

/** View transform applied as a CSS transform on the canvas layer. */
export interface Transform {
  x: number
  y: number
  scale: number
  rotation: number
}

export type FilterMode =
  | 'none'
  | 'lineart'
  | 'posterize'
  | 'threshold'
  | 'adaptive'

export type LineArtAlgo = 'sobel' | 'xdog' | 'canny'

export interface FilterState {
  mode: FilterMode
  lineart: {
    algo: LineArtAlgo
    threshold: number
    thickness: number
    invert: boolean
  }
  posterize: { levels: 2 | 3 | 4 | 5 }
  threshold: { cutoff: number }
  adaptive: { blockSize: number; strength: number }
  preBlur: number
  blend: number // 0 = original, 1 = filtered
}

const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0 }

const DEFAULT_FILTER: FilterState = {
  mode: 'lineart',
  lineart: { algo: 'xdog', threshold: 0.5, thickness: 1, invert: false },
  posterize: { levels: 3 },
  threshold: { cutoff: 0.5 },
  adaptive: { blockSize: 15, strength: 0.5 },
  preBlur: 0,
  blend: 1,
}

export interface EtchState {
  image: SourceImage | null
  transform: Transform
  filter: FilterState
  grid: { on: boolean; divisions: number; snap: boolean }
  flip: { h: boolean; v: boolean }
  flipTimer: { on: boolean; intervalSec: number }
  locked: boolean
  ui: { controlsVisible: boolean }

  // actions
  setImage: (image: SourceImage | null) => void
  setTransform: (patch: Partial<Transform>) => void
  setFilter: (patch: Partial<FilterState>) => void
  toggleLock: () => void
  setControlsVisible: (visible: boolean) => void
  reset: () => void
}

export const useEtchStore = create<EtchState>((set) => ({
  image: null,
  transform: { ...IDENTITY_TRANSFORM },
  filter: { ...DEFAULT_FILTER },
  grid: { on: false, divisions: 3, snap: false },
  flip: { h: false, v: false },
  flipTimer: { on: false, intervalSec: 30 },
  locked: false,
  ui: { controlsVisible: true },

  setImage: (image) => set({ image }),
  setTransform: (patch) =>
    set((s) => ({ transform: { ...s.transform, ...patch } })),
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  toggleLock: () => set((s) => ({ locked: !s.locked })),
  setControlsVisible: (visible) =>
    set((s) => ({ ui: { ...s.ui, controlsVisible: visible } })),
  reset: () =>
    set({
      transform: { ...IDENTITY_TRANSFORM },
      filter: { ...DEFAULT_FILTER },
    }),
}))

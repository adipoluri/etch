import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useImageLoader } from '../hooks/useImageLoader.ts'

interface Props {
  className?: string
  children: ReactNode
}

/** A button that opens the native photo/file picker. */
export default function ImageInput({ className, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const load = useImageLoader()

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void load(file)
          e.target.value = '' // allow re-picking the same file
        }}
      />
      <button
        type="button"
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
    </>
  )
}

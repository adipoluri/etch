// One-off: render public/icon-src.svg into the PWA PNG icons.
// Run with: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const path = (rel) => fileURLToPath(new URL(rel, import.meta.url))

const svg = readFileSync(path('../public/icon-src.svg'))
mkdirSync(path('../public/icons/'), { recursive: true })

const targets = [
  ['../public/icons/icon-192.png', 192],
  ['../public/icons/icon-512.png', 512],
  ['../public/icons/icon-512-maskable.png', 512],
  ['../public/apple-touch-icon.png', 180],
  ['../public/icons/icon-180.png', 180],
]

for (const [rel, size] of targets) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(path(rel))
  console.log(`wrote ${rel} (${size}px)`)
}

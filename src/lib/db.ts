import { openDB, type IDBPDatabase } from 'idb'
import type { FilterState, EtchState } from '../store/useEtchStore.ts'

/** Persisted session — the source image blob plus filter/aid settings. The
 *  view transform is intentionally NOT persisted (the image re-fits on restore,
 *  which avoids racing the auto-fit). */
export interface SavedSession {
  blob: Blob
  filter: FilterState
  flip: EtchState['flip']
  grid: EtchState['grid']
  flipTimer: EtchState['flipTimer']
}

const DB_NAME = 'etch'
const STORE = 'session'
const KEY = 'current'

let dbPromise: Promise<IDBPDatabase> | null = null
function db() {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore(STORE)
    },
  })
  return dbPromise
}

export async function saveSession(session: SavedSession): Promise<void> {
  try {
    await (await db()).put(STORE, session, KEY)
  } catch (err) {
    // Storage may be unavailable or evicted — best effort.
    console.warn('Failed to save session', err)
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    return (await (await db()).get(STORE, KEY)) ?? null
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  try {
    await (await db()).delete(STORE, KEY)
  } catch {
    /* ignore */
  }
}

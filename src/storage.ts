import { useSyncExternalStore } from 'react'

/** Spaced-repetition intervals in days, indexed by a line's level. */
const INTERVALS = [0, 1, 3, 7, 16, 35]
const DAY = 24 * 60 * 60 * 1000

export type LineState = {
  learned: boolean
  level: number // 0 = learned but never reviewed, INTERVALS.length - 1 = mastered
  due: number // epoch ms when the next review is due
  reps: number
  lapses: number
}

export type Settings = { sound: boolean }

export type Store = {
  lines: Record<string, LineState>
  last?: { openingId: string; lineIdx: number }
  settings: Settings
  streak: { count: number; day: string }
}

const KEY = 'chessreps-v2'
const EMPTY: Store = { lines: {}, settings: { sound: true }, streak: { count: 0, day: '' } }

export const lineKey = (openingId: string, lineName: string) => `${openingId}::${lineName}`
export const MASTERED_LEVEL = INTERVALS.length - 1

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Store) } : EMPTY
  } catch {
    return EMPTY
  }
}

let state = read()
const listeners = new Set<() => void>()

function write(next: Store) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable (private mode): keep the in-memory copy
  }
  listeners.forEach((l) => l())
}

export function useStore(): Store {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

const today = () => new Date().toISOString().slice(0, 10)

function bumpStreak(s: Store): Store['streak'] {
  const t = today()
  if (s.streak.day === t) return s.streak
  const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10)
  return { count: s.streak.day === yesterday ? s.streak.count + 1 : 1, day: t }
}

/** Learn mode finished a line: schedule its first review for now. */
export function recordLearned(key: string) {
  const cur = state.lines[key]
  if (cur?.learned) return write({ ...state, streak: bumpStreak(state) })
  write({
    ...state,
    streak: bumpStreak(state),
    lines: { ...state.lines, [key]: { learned: true, level: 0, due: Date.now(), reps: 0, lapses: 0 } },
  })
}

/** A from-memory run finished: move the line up (clean) or back down (mistakes). */
export function recordReview(key: string, mistakes: number) {
  const cur = state.lines[key] ?? { learned: true, level: 0, due: 0, reps: 0, lapses: 0 }
  const level = mistakes === 0 ? Math.min(cur.level + 1, MASTERED_LEVEL) : Math.max(cur.level - 1, 0)
  const days = mistakes === 0 ? INTERVALS[level] : 0
  write({
    ...state,
    streak: bumpStreak(state),
    lines: {
      ...state.lines,
      [key]: {
        learned: true,
        level,
        due: Date.now() + days * DAY,
        reps: cur.reps + 1,
        lapses: cur.lapses + (mistakes ? 1 : 0),
      },
    },
  })
}

export function setLast(openingId: string, lineIdx: number) {
  if (state.last?.openingId === openingId && state.last.lineIdx === lineIdx) return
  write({ ...state, last: { openingId, lineIdx } })
}

export function toggleSound() {
  write({ ...state, settings: { ...state.settings, sound: !state.settings.sound } })
}

export function resetProgress() {
  write({ ...EMPTY, settings: state.settings })
}

export function isDue(s: LineState | undefined) {
  return !!s?.learned && s.due <= Date.now()
}

export function lineStatus(s: LineState | undefined): 'new' | 'learning' | 'due' | 'mastered' {
  if (!s?.learned) return 'new'
  if (isDue(s)) return 'due'
  return s.level >= MASTERED_LEVEL ? 'mastered' : 'learning'
}

export function getStore() {
  return state
}

import type { Opening } from './data/types.ts'
import { isDue, lineKey, MASTERED_LEVEL, type Store } from './storage.ts'

export function openingStats(o: Opening, store: Store) {
  const states = o.lines.map((l) => store.lines[lineKey(o.id, l.name)])
  const learned = states.filter((s) => s?.learned).length
  const mastered = states.filter((s) => s?.learned && s.level >= MASTERED_LEVEL).length
  const due = states.filter(isDue).length
  const pct = Math.round(
    (states.reduce((n, s) => n + (s?.learned ? (1 + s.level) / (1 + MASTERED_LEVEL) : 0), 0) / o.lines.length) * 100,
  )
  const nextNew = states.findIndex((s) => !s?.learned)
  return { learned, mastered, due, pct, nextNew }
}

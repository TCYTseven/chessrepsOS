import type { Line, Opening, Side, Step } from './data/types.ts'

export type Mode = 'learn' | 'practice'

/** Lines whose first moves match the moves played so far. */
export function candidates(lines: Line[], history: string[]): Line[] {
  return lines.filter(
    (l) => l.steps.length >= history.length && history.every((san, i) => l.steps[i][0] === san),
  )
}

/** Distinct next steps across the candidate lines, in line order. */
export function nextSteps(lines: Line[], history: string[]): Step[] {
  const seen = new Map<string, Step>()
  for (const l of candidates(lines, history)) {
    const step = l.steps[history.length]
    if (step && !seen.has(step[0])) seen.set(step[0], step)
  }
  return [...seen.values()]
}

/** The line that has been played to its last move, if any. */
export function finishedLine(lines: Line[], history: string[]): Line | undefined {
  return candidates(lines, history).find((l) => l.steps.length === history.length)
}

export function sideToMove(history: string[]): Side {
  return history.length % 2 === 0 ? 'w' : 'b'
}

/** Lines the trainer follows: one chosen line in Learn mode, the whole repertoire in Practice. */
export function activeLines(opening: Opening, lineIdx: number, mode: Mode): Line[] {
  return mode === 'learn' ? [opening.lines[lineIdx]] : opening.lines
}

export function noteFor(lines: Line[], history: string[], ply: number): string | undefined {
  const l = candidates(lines, history.slice(0, ply + 1))[0]
  return l?.steps[ply]?.[1]
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

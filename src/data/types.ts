export type Side = 'w' | 'b'

/** A single half-move with the coaching note shown after it is played. */
export type Step = [san: string, note: string]

export type Line = {
  name: string
  steps: Step[]
}

export type Opening = {
  id: string
  name: string
  eco: string
  side: Side
  family: 'e4' | 'd4' | 'flank'
  summary: string
  ideas: string[]
  lines: Line[]
}

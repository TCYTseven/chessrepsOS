const KEY = 'chessreps-progress-v1'

/** lineKey -> { learned, practiced, perfect } counts */
export type LineProgress = { learned: number; practiced: number; perfect: number }
export type Progress = Record<string, LineProgress>

export const lineKey = (openingId: string, lineName: string) => `${openingId}::${lineName}`

export function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Progress
  } catch {
    return {}
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // storage unavailable (private mode); progress just won't persist
  }
}

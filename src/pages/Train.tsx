import { useMemo, useState } from 'react'
import type { Opening } from '../data/types.ts'
import { OPENINGS } from '../data/openings.ts'
import { href } from '../router.ts'
import { getStore, isDue, lineKey, recordLearned, recordReview, setLast, useStore } from '../storage.ts'
import { Trainer } from '../components/Trainer.tsx'

/** Learn or test a single line. */
export function TrainLine({ opening, lineIdx, mode }: { opening: Opening; lineIdx: number; mode: 'learn' | 'practice' }) {
  const [run, setRun] = useState(0)
  const line = opening.lines[lineIdx]
  const idxs = useMemo(() => [lineIdx], [lineIdx])
  const hasNext = lineIdx + 1 < opening.lines.length
  const nextLearn = href({ page: 'train', openingId: opening.id, lineIdx: lineIdx + 1, mode: 'learn' })
  const course = href({ page: 'course', openingId: opening.id })

  return (
    <Trainer
      key={`${opening.id}-${lineIdx}-${mode}-${run}`}
      opening={opening}
      lineIdxs={idxs}
      mode={mode === 'learn' ? 'learn' : 'recall'}
      back={{ label: opening.name, href: course }}
      title={line.name}
      subtitle={`${opening.name} · Line ${lineIdx + 1} of ${opening.lines.length}`}
      onFinish={(i, mistakes) => {
        const key = lineKey(opening.id, opening.lines[i].name)
        setLast(opening.id, i)
        if (mode === 'learn') recordLearned(key)
        else recordReview(key, mistakes)
      }}
      doneActions={(_, mistakes) =>
        mode === 'learn' ? (
          <>
            <a className="btn primary" href={href({ page: 'train', openingId: opening.id, lineIdx, mode: 'practice' })}>
              Now play it from memory
            </a>
            <button className="btn" onClick={() => setRun((r) => r + 1)}>
              Watch again
            </button>
          </>
        ) : mistakes > 0 ? (
          <>
            <button className="btn primary" onClick={() => setRun((r) => r + 1)}>
              Try again
            </button>
            <a className="btn" href={course}>
              Back to course
            </a>
          </>
        ) : (
          <>
            <a className="btn primary" href={hasNext ? nextLearn : href({ page: 'drill', openingId: opening.id })}>
              {hasNext ? 'Learn next line' : 'Drill all lines'}
            </a>
            <a className="btn" href={course}>
              Back to course
            </a>
          </>
        )
      }
    />
  )
}

/** Every line of an opening; the bot chooses the defence. */
export function Drill({ opening }: { opening: Opening }) {
  const [run, setRun] = useState(0)
  const idxs = useMemo(() => opening.lines.map((_, i) => i), [opening])
  const course = href({ page: 'course', openingId: opening.id })
  return (
    <Trainer
      key={`${opening.id}-drill-${run}`}
      opening={opening}
      lineIdxs={idxs}
      mode="recall"
      back={{ label: opening.name, href: course }}
      title="Drill: all lines"
      subtitle={`${opening.name} · the bot picks from ${opening.lines.length} lines`}
      onFinish={(i, mistakes) => {
        setLast(opening.id, i)
        recordReview(lineKey(opening.id, opening.lines[i].name), mistakes)
      }}
      doneActions={() => (
        <>
          <button className="btn primary" onClick={() => setRun((r) => r + 1)}>
            Drill again
          </button>
          <a className="btn" href={course}>
            Back to course
          </a>
        </>
      )}
    />
  )
}

function dueQueue() {
  const store = getStore()
  return OPENINGS.flatMap((o) =>
    o.lines.flatMap((l, i) => {
      const s = store.lines[lineKey(o.id, l.name)]
      return isDue(s) ? [{ opening: o, lineIdx: i, due: s!.due }] : []
    }),
  ).sort((a, b) => a.due - b.due)
}

function nextDueLabel() {
  const upcoming = Object.values(getStore().lines)
    .filter((l) => l.learned)
    .map((l) => l.due)
    .sort((a, b) => a - b)[0]
  if (!upcoming) return undefined
  const hours = Math.round((upcoming - Date.now()) / 3_600_000)
  return hours < 24 ? `in about ${Math.max(hours, 1)} hour${hours > 1 ? 's' : ''}` : `in ${Math.round(hours / 24)} days`
}

/** Spaced-repetition queue across every opening. */
export function Review() {
  useStore() // re-render when a review is recorded
  const [run, setRun] = useState(0)
  const [current, setCurrent] = useState(() => dueQueue()[0])
  const remaining = dueQueue().length

  if (!current) {
    const next = nextDueLabel()
    return (
      <div className="page empty-page">
        <div className="empty-icon">✓</div>
        <h1>All caught up</h1>
        <p className="muted">
          {next
            ? `Your next review is ${next}. Learn a new line in the meantime.`
            : 'Learn a line first. It shows up here when it is time to review it.'}
        </p>
        <a className="btn primary lg" href={href({ page: 'openings' })}>
          Find an opening
        </a>
      </div>
    )
  }

  const { opening, lineIdx } = current
  return (
    <Trainer
      key={`${opening.id}-${lineIdx}-review-${run}`}
      opening={opening}
      lineIdxs={[lineIdx]}
      mode="recall"
      back={{ label: 'Home', href: href({ page: 'home' }) }}
      title={opening.lines[lineIdx].name}
      subtitle={`Review · ${opening.name}`}
      onFinish={(i, mistakes) => recordReview(lineKey(opening.id, opening.lines[i].name), mistakes)}
      doneActions={() =>
        remaining > 0 ? (
          <button
            className="btn primary"
            onClick={() => {
              setCurrent(dueQueue()[0])
              setRun((r) => r + 1)
            }}
          >
            Next review ({remaining} left)
          </button>
        ) : (
          <a className="btn primary" href={href({ page: 'home' })}>
            Done for today
          </a>
        )
      }
    />
  )
}

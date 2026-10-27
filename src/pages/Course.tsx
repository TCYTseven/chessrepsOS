import type { Opening } from '../data/types.ts'
import { href } from '../router.ts'
import { lineKey, lineStatus, useStore } from '../storage.ts'
import { openingStats } from '../progressStats.ts'
import { MiniBoard } from '../components/MiniBoard.tsx'
import { previewMoves } from '../components/OpeningCard.tsx'
import { BackIcon } from '../components/Icons.tsx'

const STATUS_LABEL = { new: 'New', learning: 'Learning', due: 'Review due', mastered: 'Mastered' }

function movesText(steps: [string, string][], n = 10) {
  return steps
    .slice(0, n)
    .map(([san], i) => (i % 2 === 0 ? `${i / 2 + 1}.${san}` : san))
    .join(' ')
}

export function Course({ opening }: { opening: Opening }) {
  const store = useStore()
  const s = openingStats(opening, store)
  const firstDue = opening.lines.findIndex((l) => lineStatus(store.lines[lineKey(opening.id, l.name)]) === 'due')

  const primary =
    s.nextNew >= 0
      ? {
          label: s.learned === 0 ? 'Start learning' : `Learn next line`,
          to: href({ page: 'train', openingId: opening.id, lineIdx: s.nextNew, mode: 'learn' }),
        }
      : firstDue >= 0
        ? { label: 'Review due line', to: href({ page: 'train', openingId: opening.id, lineIdx: firstDue, mode: 'practice' }) }
        : { label: 'Drill all lines', to: href({ page: 'drill', openingId: opening.id }) }

  return (
    <div className="page course">
      <a className="back-link" href={href({ page: 'openings' })}>
        <BackIcon width={18} height={18} /> All openings
      </a>
      <section className="course-head">
        <MiniBoard moves={previewMoves(opening, 10)} flip={opening.side === 'b'} />
        <div className="course-info">
          <div className="oc-top">
            <span className={`side-tag ${opening.side}`}>
              {opening.side === 'w' ? 'You play White' : 'You play Black'}
            </span>
            <span className="oc-meta">{opening.eco}</span>
          </div>
          <h1>{opening.name}</h1>
          <p className="summary">{opening.summary}</p>
          <ul className="ideas">
            {opening.ideas.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <div className="course-progress">
            <div className="bar">
              <span style={{ width: `${s.pct}%` }} />
            </div>
            <span className="oc-meta">
              {s.learned}/{opening.lines.length} learned · {s.mastered} mastered
            </span>
          </div>
          <div className="hero-ctas">
            <a className="btn primary lg" href={primary.to}>
              {primary.label}
            </a>
            {opening.lines.length > 1 && (
              <a className="btn lg" href={href({ page: 'drill', openingId: opening.id })}>
                Drill all lines
              </a>
            )}
          </div>
        </div>
      </section>

      <h2>Lines</h2>
      <ol className="line-list">
        {opening.lines.map((l, i) => {
          const status = lineStatus(store.lines[lineKey(opening.id, l.name)])
          return (
            <li key={l.name} className="line-row">
              <span className="line-num">{i + 1}</span>
              <div className="line-main">
                <div className="line-name">
                  {l.name} <span className={`status ${status}`}>{STATUS_LABEL[status]}</span>
                </div>
                <div className="line-moves">{movesText(l.steps)}…</div>
              </div>
              <div className="line-actions">
                <a className="btn sm" href={href({ page: 'train', openingId: opening.id, lineIdx: i, mode: 'learn' })}>
                  Learn
                </a>
                <a
                  className={`btn sm ${status === 'due' ? 'primary' : ''}`}
                  href={href({ page: 'train', openingId: opening.id, lineIdx: i, mode: 'practice' })}
                >
                  Test
                </a>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

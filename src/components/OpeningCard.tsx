import type { Opening } from '../data/types.ts'
import { href } from '../router.ts'
import { useStore } from '../storage.ts'
import { openingStats } from '../progressStats.ts'
import { MiniBoard } from './MiniBoard.tsx'

export function previewMoves(o: Opening, plies = 8) {
  return o.lines[0].steps.slice(0, plies).map(([san]) => san)
}

export function OpeningCard({ opening }: { opening: Opening }) {
  const store = useStore()
  const s = openingStats(opening, store)
  return (
    <a className="opening-card" href={href({ page: 'course', openingId: opening.id })}>
      <MiniBoard moves={previewMoves(opening)} flip={opening.side === 'b'} />
      <div className="oc-body">
        <div className="oc-top">
          <span className={`side-tag ${opening.side}`}>{opening.side === 'w' ? 'White' : 'Black'}</span>
          {s.due > 0 && <span className="due-tag">{s.due} due</span>}
        </div>
        <div className="oc-name">{opening.name}</div>
        <div className="oc-meta">
          {opening.eco} · {opening.lines.length} lines
        </div>
        <div className="bar" aria-label={`${s.pct}% mastered`}>
          <span style={{ width: `${s.pct}%` }} />
        </div>
        <div className="oc-meta">
          {s.learned === 0 ? 'Not started' : `${s.learned}/${opening.lines.length} learned · ${s.pct}% mastery`}
        </div>
      </div>
    </a>
  )
}

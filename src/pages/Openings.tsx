import { useState } from 'react'
import { OPENINGS } from '../data/openings.ts'
import { OpeningCard } from '../components/OpeningCard.tsx'
import { SearchIcon } from '../components/Icons.tsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'w', label: 'As White' },
  { id: 'b', label: 'As Black' },
  { id: 'e4', label: '1.e4 games' },
  { id: 'd4', label: '1.d4 & flank' },
] as const

export function Openings() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [q, setQ] = useState('')
  const list = OPENINGS.filter((o) => {
    if (filter === 'w' || filter === 'b') if (o.side !== filter) return false
    if (filter === 'e4' && o.family !== 'e4') return false
    if (filter === 'd4' && o.family === 'e4') return false
    const needle = q.trim().toLowerCase()
    return !needle || `${o.name} ${o.eco} ${o.lines.map((l) => l.name).join(' ')}`.toLowerCase().includes(needle)
  })
  return (
    <div className="page">
      <h1>Openings</h1>
      <div className="toolbar">
        <div className="filters" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={`chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="search">
          <SearchIcon width={18} height={18} />
          <input placeholder="Search openings or lines" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {list.length ? (
        <div className="card-grid">
          {list.map((o) => (
            <OpeningCard key={o.id} opening={o} />
          ))}
        </div>
      ) : (
        <p className="muted empty-state">No openings match &ldquo;{q}&rdquo;.</p>
      )}
    </div>
  )
}

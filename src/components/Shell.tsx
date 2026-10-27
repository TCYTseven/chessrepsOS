import type { ReactNode } from 'react'
import { OPENINGS } from '../data/openings.ts'
import { href, type Route } from '../router.ts'
import { isDue, lineKey, toggleSound, useStore } from '../storage.ts'
import { BookIcon, HomeIcon, RepeatIcon, SoundIcon } from './Icons.tsx'

export function useDueCount() {
  const store = useStore()
  return OPENINGS.reduce(
    (n, o) => n + o.lines.filter((l) => isDue(store.lines[lineKey(o.id, l.name)])).length,
    0,
  )
}

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const store = useStore()
  const due = useDueCount()
  const section =
    route.page === 'home' ? 'home' : route.page === 'review' ? 'review' : 'openings'
  const nav = [
    { id: 'home', label: 'Home', to: href({ page: 'home' }), icon: <HomeIcon /> },
    { id: 'openings', label: 'Openings', to: href({ page: 'openings' }), icon: <BookIcon /> },
    { id: 'review', label: 'Review', to: href({ page: 'review' }), icon: <RepeatIcon />, badge: due },
  ]
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <a className="logo" href={href({ page: 'home' })}>
          <span className="logo-mark">♞</span>
          <span className="logo-text">ChessReps</span>
        </a>
        {nav.map((n) => (
          <a key={n.id} href={n.to} className={`nav-item ${section === n.id ? 'active' : ''}`}>
            {n.icon}
            <span className="label">{n.label}</span>
            {!!n.badge && <span className="badge">{n.badge}</span>}
          </a>
        ))}
        <button
          className="nav-item sound-toggle"
          onClick={toggleSound}
          aria-label={store.settings.sound ? 'Mute sounds' : 'Unmute sounds'}
        >
          <SoundIcon muted={!store.settings.sound} />
          <span className="label">{store.settings.sound ? 'Sound on' : 'Sound off'}</span>
        </button>
      </nav>
      <main className="content">{children}</main>
    </div>
  )
}

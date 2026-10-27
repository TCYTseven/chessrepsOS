import { useEffect } from 'react'
import { OPENINGS } from './data/openings.ts'
import { useRoute } from './router.ts'
import { Shell } from './components/Shell.tsx'
import { Home } from './pages/Home.tsx'
import { Openings } from './pages/Openings.tsx'
import { Course } from './pages/Course.tsx'
import { Drill, Review, TrainLine } from './pages/Train.tsx'
import './App.css'

export default function App() {
  const route = useRoute()
  const opening = 'openingId' in route ? OPENINGS.find((o) => o.id === route.openingId) : undefined
  const missing = 'openingId' in route && (!opening || (route.page === 'train' && !opening.lines[route.lineIdx]))

  useEffect(() => {
    const name = opening && !missing ? `${opening.name} · ` : route.page === 'review' ? 'Review · ' : ''
    document.title = `${name}ChessReps: learn chess openings`
    window.scrollTo(0, 0)
  }, [route.page, opening, missing])

  let page
  if (missing) page = <NotFound />
  else if (route.page === 'openings') page = <Openings />
  else if (route.page === 'course') page = <Course opening={opening!} />
  else if (route.page === 'train') page = <TrainLine opening={opening!} lineIdx={route.lineIdx} mode={route.mode} />
  else if (route.page === 'drill') page = <Drill opening={opening!} />
  else if (route.page === 'review') page = <Review />
  else page = <Home />

  return <Shell route={route}>{page}</Shell>
}

function NotFound() {
  return (
    <div className="page empty-page">
      <h1>Opening not found</h1>
      <p className="muted">That link doesn&rsquo;t match any opening in the library.</p>
      <a className="btn primary lg" href="#/openings">
        Browse openings
      </a>
    </div>
  )
}

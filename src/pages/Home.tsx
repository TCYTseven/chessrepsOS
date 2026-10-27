import { OPENINGS } from '../data/openings.ts'
import { href } from '../router.ts'
import { useStore } from '../storage.ts'
import { MiniBoard } from '../components/MiniBoard.tsx'
import { OpeningCard, previewMoves } from '../components/OpeningCard.tsx'
import { useDueCount } from '../components/Shell.tsx'
import { FlameIcon } from '../components/Icons.tsx'

const TOTAL_LINES = OPENINGS.reduce((n, o) => n + o.lines.length, 0)

export function Home() {
  const store = useStore()
  const due = useDueCount()
  const learned = Object.values(store.lines).filter((l) => l.learned).length
  const last = store.last && OPENINGS.find((o) => o.id === store.last!.openingId)
  const lastLine = last?.lines[store.last!.lineIdx]
  const italian = OPENINGS[0]

  return (
    <div className="page home">
      {learned === 0 ? (
        <section className="hero">
          <div className="hero-copy">
            <h1>Learn chess openings by playing them.</h1>
            <p>
              {OPENINGS.length} popular openings and {TOTAL_LINES} lines, with a coach explaining every move. The bot
              plays the other side, and spaced repetition brings each line back until you know it.
            </p>
            <div className="hero-ctas">
              <a className="btn primary lg" href={href({ page: 'train', openingId: italian.id, lineIdx: 0, mode: 'learn' })}>
                Start with the Italian Game
              </a>
              <a className="btn lg" href={href({ page: 'openings' })}>
                Browse all openings
              </a>
            </div>
            <ol className="steps">
              <li>
                <b>Learn</b> Follow the arrow while the coach explains each move.
              </li>
              <li>
                <b>Recall</b> Play the line from memory. Mistakes get corrected on the spot.
              </li>
              <li>
                <b>Review</b> Lines come back right before you would forget them.
              </li>
            </ol>
          </div>
          <div className="hero-visual">
            <MiniBoard moves={previewMoves(italian, 6)} />
            <div className="hero-bubble">
              <span className="move-chip">3. Bc4</span> The Italian bishop. It targets f7, the square only the king
              defends.
            </div>
          </div>
        </section>
      ) : (
        <section className="dashboard">
          <h1>Welcome back</h1>
          <div className="stat-row">
            <div className="stat">
              <div className="stat-num">
                {learned}
                <small>/{TOTAL_LINES}</small>
              </div>
              <div className="stat-label">Lines learned</div>
            </div>
            <div className="stat">
              <div className="stat-num">{due}</div>
              <div className="stat-label">Reviews due</div>
            </div>
            <div className="stat">
              <div className="stat-num">
                <FlameIcon className="flame" /> {store.streak.count}
              </div>
              <div className="stat-label">Day streak</div>
            </div>
          </div>
          <div className="action-row">
            {due > 0 && (
              <a className="action-card review" href={href({ page: 'review' })}>
                <div className="ac-kicker">Review</div>
                <div className="ac-title">
                  {due} line{due === 1 ? '' : 's'} ready to review
                </div>
                <span className="btn primary">Start review</span>
              </a>
            )}
            {last && lastLine && (
              <a className="action-card" href={href({ page: 'course', openingId: last.id })}>
                <MiniBoard moves={previewMoves(last)} flip={last.side === 'b'} />
                <div>
                  <div className="ac-kicker">Continue</div>
                  <div className="ac-title">{last.name}</div>
                  <div className="oc-meta">{lastLine.name}</div>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Openings for White</h2>
          <a href={href({ page: 'openings' })}>See all</a>
        </div>
        <div className="card-grid">
          {OPENINGS.filter((o) => o.side === 'w').map((o) => (
            <OpeningCard key={o.id} opening={o} />
          ))}
        </div>
      </section>
      <section>
        <div className="section-head">
          <h2>Openings for Black</h2>
        </div>
        <div className="card-grid">
          {OPENINGS.filter((o) => o.side === 'b').map((o) => (
            <OpeningCard key={o.id} opening={o} />
          ))}
        </div>
      </section>
    </div>
  )
}

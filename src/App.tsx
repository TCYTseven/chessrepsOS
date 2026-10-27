import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { OPENINGS } from './data/openings.ts'
import type { Opening } from './data/types.ts'
import {
  activeLines,
  finishedLine,
  nextSteps,
  noteFor,
  pickRandom,
  sideToMove,
  type Mode,
} from './trainer.ts'
import { lineKey, loadProgress, saveProgress, type Progress } from './progress.ts'
import './App.css'

const OPPONENT_DELAY_MS = 550

type Tab = 'openings' | 'lesson'

function replay(history: string[]) {
  const game = new Chess()
  for (const san of history) game.move(san)
  return game
}

/** from/to squares of a SAN move played from the position after `history`. */
function squaresOf(history: string[], san: string) {
  const m = replay(history).move(san)
  return { from: m.from, to: m.to }
}

export default function App() {
  const [openingId, setOpeningId] = useState(OPENINGS[0].id)
  const [lineIdx, setLineIdx] = useState(0)
  const [mode, setMode] = useState<Mode>('learn')
  const [tab, setTab] = useState<Tab>('openings')
  const [history, setHistory] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [hint, setHint] = useState(false)
  const [wrong, setWrong] = useState<{ square: string; san: string } | null>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const recorded = useRef(false)

  const opening = OPENINGS.find((o) => o.id === openingId)!
  const userSide = opening.side
  const lines = activeLines(opening, lineIdx, mode)
  const game = useMemo(() => replay(history), [history])
  const expected = nextSteps(lines, history)
  const done = finishedLine(lines, history)
  const userTurn = !done && sideToMove(history) === userSide && expected.length > 0

  function restart(next?: Partial<{ openingId: string; lineIdx: number; mode: Mode }>) {
    if (next?.openingId !== undefined) setOpeningId(next.openingId)
    if (next?.lineIdx !== undefined) setLineIdx(next.lineIdx)
    if (next?.mode !== undefined) setMode(next.mode)
    setHistory([])
    setMistakes(0)
    setHint(false)
    setWrong(null)
    setSelected(null)
    recorded.current = false
  }

  // Opponent replies automatically with a book defence (random branch in Practice).
  useEffect(() => {
    if (done || sideToMove(history) === userSide) return
    const options = nextSteps(lines, history)
    if (!options.length) return
    const t = setTimeout(() => setHistory((h) => [...h, pickRandom(options)[0]]), OPPONENT_DELAY_MS)
    return () => clearTimeout(t)
  }, [history, openingId, lineIdx, mode])

  // Record progress once per completed run.
  useEffect(() => {
    if (!done || recorded.current) return
    recorded.current = true
    setProgress((p) => {
      const key = lineKey(opening.id, done.name)
      const cur = p[key] ?? { learned: 0, practiced: 0, perfect: 0 }
      const next = {
        ...p,
        [key]: {
          learned: cur.learned + (mode === 'learn' ? 1 : 0),
          practiced: cur.practiced + (mode === 'practice' ? 1 : 0),
          perfect: cur.perfect + (mode === 'practice' && mistakes === 0 ? 1 : 0),
        },
      }
      saveProgress(next)
      return next
    })
  }, [done, mode, mistakes, opening.id])

  useEffect(() => {
    if (!wrong) return
    const t = setTimeout(() => setWrong(null), 1400)
    return () => clearTimeout(t)
  }, [wrong])

  function tryMove(from: string, to: string): boolean {
    setSelected(null)
    if (!userTurn) return false
    let san: string
    try {
      san = new Chess(game.fen()).move({ from, to, promotion: 'q' }).san
    } catch {
      return false
    }
    if (expected.some(([s]) => s === san)) {
      setHistory([...history, san])
      setHint(false)
      setWrong(null)
      return true
    }
    setWrong({ square: to, san })
    setMistakes((m) => m + 1)
    if (mode === 'practice' && mistakes + 1 >= 2) setHint(true)
    return false
  }

  function onSquareClick(square: string) {
    const sq = square as Square
    const piece = game.get(sq)
    if (selected && selected !== sq) {
      if (piece && piece.color === userSide) {
        setSelected(sq)
        return
      }
      tryMove(selected, sq)
      return
    }
    if (piece && piece.color === userSide && userTurn) setSelected(selected === sq ? null : sq)
  }

  function undo() {
    // Step back to the previous position where it was the user's move.
    let h = history.slice(0, -1)
    while (h.length && sideToMove(h) !== userSide) h = h.slice(0, -1)
    if (sideToMove(h) !== userSide) h = []
    recorded.current = false
    setHistory(h)
    setHint(false)
    setWrong(null)
  }

  // ── board decorations ──
  const squareStyles: Record<string, React.CSSProperties> = {}
  const last = game.history({ verbose: true }).at(-1)
  if (last) {
    squareStyles[last.from] = { backgroundColor: 'var(--last-move)' }
    squareStyles[last.to] = { backgroundColor: 'var(--last-move)' }
  }
  if (selected) {
    squareStyles[selected] = { backgroundColor: 'var(--selected)' }
    for (const m of game.moves({ square: selected, verbose: true })) {
      squareStyles[m.to] = {
        ...squareStyles[m.to],
        backgroundImage: m.captured
          ? 'radial-gradient(circle, transparent 58%, rgba(0,0,0,.14) 60%)'
          : 'radial-gradient(circle, rgba(0,0,0,.14) 24%, transparent 26%)',
      }
    }
  }
  if (wrong) squareStyles[wrong.square] = { backgroundColor: 'var(--wrong)' }

  const showArrows = userTurn && (mode === 'learn' || hint)
  const arrows = showArrows
    ? expected.map(([san]) => {
        const { from, to } = squaresOf(history, san)
        return { startSquare: from, endSquare: to, color: 'rgba(129, 182, 76, 0.85)' }
      })
    : []

  const lastNote = history.length ? noteFor(lines, history, history.length - 1) : undefined

  return (
    <div className="app">
      <Sidebar
        mode={mode}
        tab={tab}
        onLearn={() => {
          setTab('lesson')
          restart({ mode: 'learn' })
        }}
        onPractice={() => {
          setTab('lesson')
          restart({ mode: 'practice' })
        }}
        onOpenings={() => setTab('openings')}
      />

      <main className="board-area">
        <PlayerBar
          name="Opening Bot"
          detail={mode === 'practice' ? 'Varies its defence' : 'Follows the line'}
          side={userSide === 'w' ? 'b' : 'w'}
          avatar="🤖"
          thinking={!done && !userTurn && expected.length > 0}
        />
        <div className="board-wrap">
          <Chessboard
            options={{
              id: 'trainer',
              position: game.fen(),
              boardOrientation: userSide === 'w' ? 'white' : 'black',
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare ? tryMove(sourceSquare, targetSquare) : false,
              onSquareClick: ({ square }) => onSquareClick(square),
              canDragPiece: ({ piece }) => userTurn && piece.pieceType[0] === userSide,
              squareStyles,
              arrows,
              allowDrawingArrows: true,
              animationDurationInMs: 200,
              darkSquareStyle: { backgroundColor: 'var(--sq-dark)' },
              lightSquareStyle: { backgroundColor: 'var(--sq-light)' },
              darkSquareNotationStyle: { color: 'var(--sq-light)', fontWeight: 600 },
              lightSquareNotationStyle: { color: 'var(--sq-dark)', fontWeight: 600 },
            }}
          />
        </div>
        <PlayerBar
          name="You"
          detail={opening.name}
          side={userSide}
          avatar="♟"
          thinking={userTurn}
        />
      </main>

      <aside className="panel">
        <div className="panel-tabs">
          <button className={tab === 'openings' ? 'active' : ''} onClick={() => setTab('openings')}>
            Openings
          </button>
          <button className={tab === 'lesson' ? 'active' : ''} onClick={() => setTab('lesson')}>
            Lesson
          </button>
        </div>

        {tab === 'openings' ? (
          <OpeningList
            progress={progress}
            current={opening.id}
            onPick={(o) => {
              setTab('lesson')
              restart({ openingId: o.id, lineIdx: 0 })
            }}
          />
        ) : (
          <div className="lesson">
            <header className="lesson-head">
              <div className="eco">
                {opening.eco} · {opening.side === 'w' ? 'You play White' : 'You play Black'}
              </div>
              <h1>{opening.name}</h1>
              <p className="summary">{opening.summary}</p>
              <ul className="ideas">
                {opening.ideas.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </header>

            <div className="mode-toggle">
              <button className={mode === 'learn' ? 'active' : ''} onClick={() => restart({ mode: 'learn' })}>
                Learn
              </button>
              <button
                className={mode === 'practice' ? 'active' : ''}
                onClick={() => restart({ mode: 'practice' })}
              >
                Practice
              </button>
            </div>

            {mode === 'learn' ? (
              <div className="line-chips">
                {opening.lines.map((l, i) => {
                  const p = progress[lineKey(opening.id, l.name)]
                  return (
                    <button
                      key={l.name}
                      className={`chip ${i === lineIdx ? 'active' : ''}`}
                      onClick={() => restart({ lineIdx: i })}
                    >
                      {p?.learned ? '✓ ' : ''}
                      {l.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="practice-note">
                The bot picks a random defence from all {opening.lines.length} lines. Play the book
                moves from memory.
              </p>
            )}

            <Coach
              opening={opening}
              mode={mode}
              history={history}
              lastNote={lastNote}
              expected={expected}
              userTurn={userTurn}
              hint={hint}
              wrong={wrong?.san}
              mistakes={mistakes}
              doneName={done?.name}
              onNextLine={() => restart({ lineIdx: (lineIdx + 1) % opening.lines.length, mode: 'learn' })}
              onPractice={() => restart({ mode: 'practice' })}
              onRestart={() => restart()}
            />

            <MoveList history={history} />

            <div className="controls">
              <button onClick={() => restart()} title="Restart line">
                ⟲ Restart
              </button>
              <button onClick={undo} disabled={!history.length} title="Take back">
                ← Back
              </button>
              <button
                onClick={() => setHint(true)}
                disabled={!userTurn || mode === 'learn' || hint}
                title="Show the move"
              >
                💡 Hint
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function Sidebar(props: {
  mode: Mode
  tab: Tab
  onLearn: () => void
  onPractice: () => void
  onOpenings: () => void
}) {
  return (
    <nav className="sidebar">
      <div className="logo">
        <span className="logo-mark">♞</span>
        <span className="logo-text">ChessReps</span>
      </div>
      <button className={props.tab === 'openings' ? 'active' : ''} onClick={props.onOpenings}>
        <span className="icon">📚</span>
        <span className="label">Openings</span>
      </button>
      <button className={props.tab === 'lesson' && props.mode === 'learn' ? 'active' : ''} onClick={props.onLearn}>
        <span className="icon">🎓</span>
        <span className="label">Learn</span>
      </button>
      <button
        className={props.tab === 'lesson' && props.mode === 'practice' ? 'active' : ''}
        onClick={props.onPractice}
      >
        <span className="icon">🎯</span>
        <span className="label">Practice</span>
      </button>
    </nav>
  )
}

function PlayerBar(props: { name: string; detail: string; side: 'w' | 'b'; avatar: string; thinking: boolean }) {
  return (
    <div className="player-bar">
      <div className={`avatar ${props.side === 'w' ? 'white' : 'black'}`}>{props.avatar}</div>
      <div className="player-info">
        <div className="player-name">{props.name}</div>
        <div className="player-detail">{props.detail}</div>
      </div>
      {props.thinking && <div className="to-move">to move</div>}
    </div>
  )
}

function OpeningList(props: { progress: Progress; current: string; onPick: (o: Opening) => void }) {
  const groups: [string, Opening[]][] = [
    ['Play as White', OPENINGS.filter((o) => o.side === 'w')],
    ['Play as Black', OPENINGS.filter((o) => o.side === 'b')],
  ]
  return (
    <div className="opening-list">
      {groups.map(([title, list]) => (
        <section key={title}>
          <h2>{title}</h2>
          {list.map((o) => {
            const learned = o.lines.filter((l) => props.progress[lineKey(o.id, l.name)]?.learned).length
            const pct = Math.round((learned / o.lines.length) * 100)
            return (
              <button
                key={o.id}
                className={`opening-item ${o.id === props.current ? 'active' : ''}`}
                onClick={() => props.onPick(o)}
              >
                <span className={`side-dot ${o.side === 'w' ? 'white' : 'black'}`} />
                <span className="opening-main">
                  <span className="opening-name">{o.name}</span>
                  <span className="opening-meta">
                    {o.eco} · {o.lines.length} lines
                  </span>
                  <span className="bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </span>
                <span className="opening-pct">{pct}%</span>
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}

function moveLabel(ply: number, san: string) {
  const n = Math.floor(ply / 2) + 1
  return ply % 2 === 0 ? `${n}. ${san}` : `${n}… ${san}`
}

function Coach(props: {
  opening: Opening
  mode: Mode
  history: string[]
  lastNote?: string
  expected: [string, string][]
  userTurn: boolean
  hint: boolean
  wrong?: string
  mistakes: number
  doneName?: string
  onNextLine: () => void
  onPractice: () => void
  onRestart: () => void
}) {
  const { history } = props
  const lastSan = history.at(-1)

  if (props.doneName) {
    return (
      <div className="coach done">
        <div className="coach-avatar">🏆</div>
        <div className="coach-body">
          <div className="coach-title">Line complete: {props.doneName}</div>
          {props.lastNote && <p>{props.lastNote}</p>}
          <p className="muted">
            {props.mode === 'practice'
              ? props.mistakes === 0
                ? 'Perfect run, no mistakes.'
                : `Finished with ${props.mistakes} mistake${props.mistakes === 1 ? '' : 's'}.`
              : 'You can now drill it in Practice mode, where the bot varies its replies.'}
          </p>
          <div className="coach-actions">
            {props.mode === 'learn' ? (
              <>
                <button className="primary" onClick={props.onNextLine}>
                  Next line →
                </button>
                <button onClick={props.onPractice}>Practice opening</button>
              </>
            ) : (
              <button className="primary" onClick={props.onRestart}>
                Practice again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const showMove = props.mode === 'learn' || props.hint
  return (
    <div className="coach">
      <div className="coach-avatar">🧑‍🏫</div>
      <div className="coach-body">
        {lastSan ? (
          <p>
            <strong>{moveLabel(history.length - 1, lastSan)}</strong> {props.lastNote}
          </p>
        ) : (
          <p>
            Welcome to the <strong>{props.opening.name}</strong>.{' '}
            {props.opening.side === 'b' ? 'White moves first.' : 'You have the first move.'}
          </p>
        )}

        {props.wrong && (
          <p className="wrong-msg">
            ✗ {props.wrong} is not the book move here. {props.mode === 'learn' ? 'Follow the arrow.' : 'Try again.'}
          </p>
        )}

        {props.userTurn ? (
          <div className="your-move">
            <div className="coach-title">Your move</div>
            {showMove ? (
              props.expected.map(([san, note]) => (
                <p key={san}>
                  Play <strong>{moveLabel(history.length, san)}</strong> {note}
                </p>
              ))
            ) : (
              <p className="muted">Find the book move. Stuck? Use a hint.</p>
            )}
          </div>
        ) : (
          <p className="muted thinking">Opponent is thinking…</p>
        )}
      </div>
    </div>
  )
}

function MoveList({ history }: { history: string[] }) {
  const rows: [number, string, string | undefined][] = []
  for (let i = 0; i < history.length; i += 2) rows.push([i / 2 + 1, history[i], history[i + 1]])
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [history.length])
  return (
    <div className="move-list">
      {rows.length === 0 && <div className="muted empty">No moves yet</div>}
      {rows.map(([n, w, b], i) => (
        <div key={n} className={`move-row ${i % 2 ? 'odd' : ''}`}>
          <span className="num">{n}.</span>
          <span className={`mv ${history.length === n * 2 - 1 ? 'cur' : ''}`}>{w}</span>
          <span className={`mv ${history.length === n * 2 ? 'cur' : ''}`}>{b ?? ''}</span>
        </div>
      ))}
      <div ref={end} />
    </div>
  )
}

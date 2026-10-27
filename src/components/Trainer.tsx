import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Opening } from '../data/types.ts'
import { candidates, finishedLine, nextSteps, pickRandom, sideToMove } from '../trainer.ts'
import { play } from '../sound.ts'
import { BackIcon, BulbIcon, CheckIcon, RestartIcon, UndoIcon, XIcon } from './Icons.tsx'

const OPPONENT_DELAY_MS = 500
const AUTO_HINT_AFTER = 3

export type TrainerMode = 'learn' | 'recall'

type Props = {
  opening: Opening
  /** Indexes into opening.lines that the bot may follow. */
  lineIdxs: number[]
  mode: TrainerMode
  back: { label: string; href: string }
  title: string
  subtitle: string
  onFinish: (lineIdx: number, mistakes: number) => void
  doneActions: (lineIdx: number, mistakes: number) => ReactNode
}

type Feedback = { kind: 'right' | 'wrong'; square: string; san?: string } | null

function replay(history: string[]) {
  const g = new Chess()
  for (const san of history) g.move(san)
  return g
}

function moveLabel(ply: number, san: string) {
  const n = Math.floor(ply / 2) + 1
  return ply % 2 === 0 ? `${n}. ${san}` : `${n}… ${san}`
}

export function Trainer(props: Props) {
  const { opening, mode } = props
  const userSide = opening.side
  const idxKey = props.lineIdxs.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lines = useMemo(() => props.lineIdxs.map((i) => opening.lines[i]), [opening, idxKey])

  const [history, setHistory] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [wrongHere, setWrongHere] = useState(0)
  const [hintLevel, setHintLevel] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const finished = useRef(false)

  const game = useMemo(() => replay(history), [history])
  const expected = nextSteps(lines, history)
  const done = finishedLine(lines, history)
  const doneIdx = done ? opening.lines.indexOf(done) : -1
  const userTurn = !done && sideToMove(history) === userSide && expected.length > 0
  const total = Math.max(...candidates(lines, history).map((l) => l.steps.length), history.length)

  /** Prefer the most detailed note any line in the opening gives for this exact move sequence. */
  function noteAt(ply: number, h = history) {
    const prefix = h.slice(0, ply + 1)
    let best = ''
    for (const l of candidates(opening.lines, prefix)) {
      const n = l.steps[ply]?.[1] ?? ''
      if (n.length > best.length) best = n
    }
    return best
  }

  // Opponent replies with a book move; with several lines in play it picks one at random.
  useEffect(() => {
    if (done || sideToMove(history) === userSide) return
    const options = nextSteps(lines, history)
    if (!options.length) return
    const t = setTimeout(() => setHistory((h) => [...h, pickRandom(options)[0]]), OPPONENT_DELAY_MS)
    return () => clearTimeout(t)
  }, [history, done, lines, userSide])

  // Sound for every move that lands.
  const lastMove = game.history({ verbose: true }).at(-1)
  useEffect(() => {
    if (lastMove) play(lastMove.captured ? 'capture' : 'move')
  }, [history.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!done || finished.current) return
    finished.current = true
    const t = setTimeout(() => play('complete'), 250)
    props.onFinish(doneIdx, mistakes)
    return () => clearTimeout(t)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (feedback?.kind !== 'wrong') return
    const t = setTimeout(() => setFeedback(null), 1200)
    return () => clearTimeout(t)
  }, [feedback])

  function restart() {
    setHistory([])
    setMistakes(0)
    setWrongHere(0)
    setHintLevel(0)
    setFeedback(null)
    setSelected(null)
    finished.current = false
  }

  function undo() {
    let h = history.slice(0, -1)
    while (h.length && sideToMove(h) !== userSide) h = h.slice(0, -1)
    if (sideToMove(h) !== userSide) h = []
    finished.current = false
    setHistory(h)
    setHintLevel(0)
    setWrongHere(0)
    setFeedback(null)
    setSelected(null)
  }

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
      setFeedback({ kind: 'right', square: to })
      setHintLevel(0)
      setWrongHere(0)
      return true
    }
    play('wrong')
    boardRef.current?.animate(
      [0, -6, 6, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 320 },
    )
    setFeedback({ kind: 'wrong', square: to, san })
    setMistakes((m) => m + 1)
    setWrongHere(wrongHere + 1)
    if (mode === 'recall' && wrongHere + 1 >= AUTO_HINT_AFTER) setHintLevel(2)
    return false
  }

  function onSquareClick(square: string) {
    const sq = square as Square
    const piece = game.get(sq)
    if (selected && selected !== sq) {
      if (piece && piece.color === userSide) setSelected(sq)
      else tryMove(selected, sq)
      return
    }
    if (piece && piece.color === userSide && userTurn) setSelected(selected === sq ? null : sq)
  }

  // ── board decorations ──
  const expectedSquares = userTurn
    ? expected.map(([san]) => {
        const m = new Chess(game.fen()).move(san)
        return { from: m.from, to: m.to }
      })
    : []

  const squareStyles: Record<string, React.CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: 'var(--last-move)' }
    squareStyles[lastMove.to] = { backgroundColor: 'var(--last-move)' }
  }
  const hintSquares = new Set<string>(
    userTurn && mode === 'recall' && hintLevel === 1 ? expectedSquares.map((m) => m.from) : [],
  )
  if (selected) {
    squareStyles[selected] = { backgroundColor: 'var(--selected)' }
    for (const m of game.moves({ square: selected, verbose: true })) {
      squareStyles[m.to] = {
        ...squareStyles[m.to],
        backgroundImage: m.captured
          ? 'radial-gradient(circle, transparent 58%, rgba(0,0,0,.16) 60%)'
          : 'radial-gradient(circle, rgba(0,0,0,.16) 24%, transparent 26%)',
      }
    }
  }
  if (feedback?.kind === 'wrong') squareStyles[feedback.square] = { backgroundColor: 'var(--wrong)' }

  const showArrows = userTurn && (mode === 'learn' || hintLevel >= 2)
  const arrows = showArrows
    ? expectedSquares.map(({ from, to }) => ({ startSquare: from, endSquare: to, color: 'rgba(129, 182, 76, 0.9)' }))
    : []

  const lastSan = history.at(-1)
  const lastWasOpponent = !!lastSan && sideToMove(history.slice(0, -1)) !== userSide

  return (
    <div className="trainer">
      <header className="t-head">
        <a className="back-link" href={props.back.href}>
          <BackIcon width={18} height={18} /> {props.back.label}
        </a>
        <div className="t-title-row">
          <div>
            <h1 className="t-title">{props.title}</h1>
            <div className="t-sub">{props.subtitle}</div>
          </div>
          <span className={`mode-pill ${mode}`}>{mode === 'learn' ? 'Learn' : 'From memory'}</span>
        </div>
        <div className="t-progress" aria-label={`Move ${history.length} of ${total}`}>
          <span style={{ width: `${(history.length / total) * 100}%` }} />
        </div>
      </header>

      <section className="t-board">
        <PlayerBar
          name="Opening Bot"
          detail={props.lineIdxs.length > 1 ? 'Picks a random book defence' : 'Plays the book line'}
          side={userSide === 'w' ? 'b' : 'w'}
          avatar="bot"
          active={!done && !userTurn && expected.length > 0}
        />
        <div className="board-wrap" ref={boardRef}>
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
              animationDurationInMs: 180,
              darkSquareStyle: { backgroundColor: 'var(--sq-dark)' },
              lightSquareStyle: { backgroundColor: 'var(--sq-light)' },
              darkSquareNotationStyle: { color: 'var(--sq-light)', fontWeight: 700 },
              lightSquareNotationStyle: { color: 'var(--sq-dark)', fontWeight: 700 },
              squareRenderer: ({ square, children }) => (
                <div className="sq">
                  {hintSquares.has(square) && <span className="sq-hint" />}
                  {children}
                  {feedback?.square === square && (
                    <span className={`sq-badge ${feedback.kind}`}>
                      {feedback.kind === 'right' ? <CheckIcon strokeWidth={3.5} /> : <XIcon strokeWidth={3.5} />}
                    </span>
                  )}
                </div>
              ),
            }}
          />
        </div>
        <PlayerBar name="You" detail={opening.name} side={userSide} avatar="you" active={userTurn} />
      </section>

      <section className="t-panel">
        {done ? (
          <div className="coach done" role="status">
            <div className="coach-icon trophy">★</div>
            <div className="coach-body">
              <div className="coach-kicker">Line complete</div>
              <div className="coach-title">{done.name}</div>
              <p>{noteAt(history.length - 1)}</p>
              <div className="result-row">
                <span className={`result ${mistakes === 0 ? 'good' : ''}`}>
                  {mistakes === 0 ? 'No mistakes' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
                </span>
                <span className="result">{history.length} moves</span>
              </div>
              <div className="coach-actions">{props.doneActions(doneIdx, mistakes)}</div>
            </div>
          </div>
        ) : (
          <div className="coach" aria-live="polite">
            <div className="coach-icon">{userTurn ? '?' : '…'}</div>
            <div className="coach-body">
              {lastSan && (
                <p className={`last-note ${lastWasOpponent ? 'opp' : 'mine'}`}>
                  <span className="move-chip">{moveLabel(history.length - 1, lastSan)}</span>{' '}
                  {noteAt(history.length - 1)}
                </p>
              )}
              {!lastSan && (
                <p className="last-note">
                  {userSide === 'w'
                    ? `You have White. Make the first move of the ${opening.name}.`
                    : `You have Black. Wait for White's first move, then answer it.`}
                </p>
              )}

              {feedback?.kind === 'wrong' && (
                <p className="wrong-msg">
                  <XIcon width={16} height={16} strokeWidth={3} /> {feedback.san} isn&rsquo;t the book move
                  here.
                  {mode === 'learn' ? ' Follow the green arrow.' : ' Try again.'}
                </p>
              )}

              {userTurn ? (
                <div className="prompt">
                  <div className="coach-kicker">Your move</div>
                  {mode === 'learn' || hintLevel >= 2 ? (
                    expected.map(([san, note]) => (
                      <p key={san}>
                        <span className="move-chip big">{moveLabel(history.length, san)}</span> {note}
                      </p>
                    ))
                  ) : (
                    <p className="muted">
                      {hintLevel === 1
                        ? 'The highlighted piece moves next. Where does it go?'
                        : 'Play the book move from memory.'}
                    </p>
                  )}
                </div>
              ) : (
                expected.length > 0 && <p className="muted thinking">Opponent is thinking…</p>
              )}
            </div>
          </div>
        )}

        <div className="controls">
          {mode === 'recall' && !done && (
            <button
              className="btn"
              onClick={() => setHintLevel((h) => Math.min(h + 1, 2))}
              disabled={!userTurn || hintLevel >= 2}
            >
              <BulbIcon width={18} height={18} /> {hintLevel === 0 ? 'Hint' : 'Show'}
            </button>
          )}
          <button className="btn" onClick={undo} disabled={!history.length}>
            <UndoIcon width={18} height={18} /> Take back
          </button>
          <button className="btn" onClick={restart} disabled={!history.length}>
            <RestartIcon width={18} height={18} /> Restart
          </button>
        </div>

        <MoveList history={history} />
      </section>
    </div>
  )
}

function PlayerBar(props: {
  name: string
  detail: string
  side: 'w' | 'b'
  avatar: 'bot' | 'you'
  active: boolean
}) {
  return (
    <div className="player-bar">
      <div className={`avatar ${props.side === 'w' ? 'white' : 'black'}`}>{props.avatar === 'bot' ? '♜' : '♙'}</div>
      <div className="player-info">
        <div className="player-name">{props.name}</div>
        <div className="player-detail">{props.detail}</div>
      </div>
      <div className={`clock ${props.active ? 'active' : ''}`}>{props.active ? 'To move' : ''}</div>
    </div>
  )
}

function MoveList({ history }: { history: string[] }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = end.current?.parentElement
    if (el) el.scrollTop = el.scrollHeight
  }, [history.length])
  const rows: [number, string, string | undefined][] = []
  for (let i = 0; i < history.length; i += 2) rows.push([i / 2 + 1, history[i], history[i + 1]])
  return (
    <div className="move-list">
      {rows.length === 0 && <div className="muted empty">Moves will appear here.</div>}
      {rows.map(([n, w, b]) => (
        <div key={n} className="move-row">
          <span className="num">{n}.</span>
          <span className={`mv ${history.length === n * 2 - 1 ? 'cur' : ''}`}>{w}</span>
          <span className={`mv ${history.length === n * 2 ? 'cur' : ''}`}>{b ?? ''}</span>
        </div>
      ))}
      <div ref={end} />
    </div>
  )
}

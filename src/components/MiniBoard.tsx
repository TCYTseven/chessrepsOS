import { useMemo } from 'react'
import { Chess } from 'chess.js'
import { defaultPieces } from 'react-chessboard'

const FILES = 'abcdefgh'

/** A static, non-interactive board used for thumbnails. */
export function MiniBoard({ moves, flip = false }: { moves: string[]; flip?: boolean }) {
  const board = useMemo(() => {
    const g = new Chess()
    for (const m of moves) g.move(m)
    return g.board()
  }, [moves])
  const rows = flip ? [...board].reverse().map((r) => [...r].reverse()) : board
  return (
    <div className="mini-board" aria-hidden>
      {rows.map((row, r) =>
        row.map((sq, c) => {
          const rank = flip ? r + 1 : 8 - r
          const file = flip ? FILES[7 - c] : FILES[c]
          const light = (FILES.indexOf(file) + rank) % 2 === 1
          const Piece = sq ? defaultPieces[`${sq.color}${sq.type.toUpperCase()}`] : undefined
          return (
            <div key={`${file}${rank}`} className={light ? 'ms light' : 'ms dark'}>
              {Piece && <Piece svgStyle={{ width: '100%', height: '100%' }} />}
            </div>
          )
        }),
      )}
    </div>
  )
}

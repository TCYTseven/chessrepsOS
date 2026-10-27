import { Chess } from 'chess.js'
import { OPENINGS } from '../src/data/openings.ts'

let bad = 0
for (const o of OPENINGS) {
  for (const l of o.lines) {
    const g = new Chess()
    for (const [i, [san]] of l.steps.entries()) {
      try { g.move(san) } catch { console.log(`ILLEGAL ${o.id} / ${l.name} ply ${i + 1}: ${san}\n  ${g.fen()}`); bad++; break }
    }
    const userLast = (l.steps.length % 2 === 1) === (o.side === 'w')
    if (!userLast) console.log(`ends on opponent move: ${o.id} / ${l.name}`)
  }
}
console.log(`${OPENINGS.length} openings, ${OPENINGS.reduce((n, o) => n + o.lines.length, 0)} lines, ${bad} illegal`)
process.exit(bad ? 1 : 0)

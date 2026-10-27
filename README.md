# chessrepsOS

An opening trainer with a chess.com-style layout: nav on the left, board in the middle, coach panel on the right.

## Features

- **20 openings, 47 lines**: 10 for White (Italian, Ruy Lopez, Scotch, Queen's Gambit, London, English, Vienna, King's Gambit, Catalan, Evans Gambit) and 10 for Black (Najdorf, Dragon, French, Caro-Kann, Scandinavian, King's Indian, Nimzo-Indian, Slav, Grünfeld, Pirc).
- **Learn mode**: pick a line. A green arrow shows your move and the coach explains every move, yours and the opponent's.
- **Practice mode**: no arrows. The bot picks a random book defence from all the lines, so you have to know each branch. Two wrong moves reveal a hint.
- The opponent side moves automatically.
- Progress saved in the browser (localStorage).
- Drag-and-drop or click-to-move.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build
npm run validate   # plays every line through chess.js to check legality
```

## Adding openings

Openings live in `src/data/white.ts` and `src/data/black.ts`. Each line is a list of `[san, note]` steps starting from the initial position. Run `npm run validate` after editing.

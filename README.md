# chessrepsOS

An opening trainer with a chess.com-style layout: nav on the left, board in the middle, coach panel on the right.

## Features

- **20 openings, 47 lines**: 10 for White (Italian, Ruy Lopez, Scotch, Queen's Gambit, London, English, Vienna, King's Gambit, Catalan, Evans Gambit) and 10 for Black (Najdorf, Dragon, French, Caro-Kann, Scandinavian, King's Indian, Nimzo-Indian, Slav, Grünfeld, Pirc).
- **Learn**: a green arrow shows your move and the coach explains every move on both sides. The bot plays the other side automatically.
- **From memory**: play the line without arrows. Wrong moves get a red X and a shake; Hint first highlights the piece, then shows the move. Three misses reveal it automatically.
- **Drill**: the bot picks a random book defence from every line of an opening.
- **Review**: spaced repetition (1, 3, 7, 16, 35 days). Clean runs push a line further out; mistakes bring it back.
- Home dashboard with lines learned, reviews due and a day streak; searchable, filterable library; course page per opening.
- Shareable links (`#/openings/italian`, `#/openings/italian/0?mode=practice`, `#/review`), move sounds with a mute toggle, phone layout with a bottom tab bar.
- Progress is stored in the browser (localStorage); there are no accounts.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/, deployable to any static host
npm run validate   # plays every line through chess.js to check legality
```

## Adding openings

Openings live in `src/data/white.ts` and `src/data/black.ts`. Each line is a list of `[san, note]` steps starting from the initial position. Run `npm run validate` after editing.

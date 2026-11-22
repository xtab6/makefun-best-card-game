# makefun-best-card-game

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/xtab6/makefun-best-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/xtab6/makefun-best-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Starfall Pact** — a duel of sky cartographers. You and Vesk, the Hollow Star, each hold 30 life and a 48-card deck drawn from 24 original cards across four elements: Ember, Tide, Thorn and Gale. Spend mana to play strikes, wards, leeches, surges and tailwinds; reduce the rival to 0 life to win. A complete card game in static files — title screen, duel table with both hands, readable card values and suits, life and score totals, mana crystals, combat log, and win and loss screens — played with mouse or keyboard (1–7 to play a card, Enter to end the turn, R to restart, M to mute). No network requests, no libraries, no build step: open `game/index.html` in desktop Chrome and play. `main.ts` (Node 22, standard library only) hands the game in by copying `game/` and `screenshots/` to `/output` and writing the judge's dossier with the vendored `makefun-game.ts` library.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` directly in a desktop browser. To hand the entry in as the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots under `screenshots/` are real renders of the game's own code: the title screen, a mid-duel table, the victory screen and the defeat screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1mhjsanj&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>

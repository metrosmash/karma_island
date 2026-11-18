# Karma Island (Milestone 1 Demo)

Top-down retro RPG island survival and karma economy sandbox built with **Phaser 3**, **Vite**, and a **framework-free JavaScript simulation engine** (`src/sim/`).

## Project Structure

- `src/sim/` — Pure JavaScript game rules with zero Phaser, DOM, or React imports (runnable in Node.js and portable to Python for RL).
  - `constants.js` — Tunable rates, tile IDs, karma costs, and multipliers.
  - `map.js` — 20×15 island tile grid, walkability, and circle-vs-tile collision helpers.
  - `character.js` — Zero-start character factory, `+1/sec` timestamp-based global stats, hunger decay, and starvation damage math.
  - `karma.js` — `askForFood` karma transfer plus `registerBirthKarma` and `feedChild` debt multiplier rules.
  - `world.js` — Sandbox world state, movement, thorn hazard damage, death, and zero-stat respawn.
- `src/persistence/` — `localStorage` save/load/clear adapter (`storage.js`).
- `src/phaser/` — Phaser 3 view and input adapter (`textures.js`, `audio.js`, `IslandScene.js`).
- `src/App.tsx` — Mounts the Phaser 3 canvas alongside the live HUD and action controls.
- `tests/sim.test.js` — Node built-in test suite (`node --test`) verifying simulation rules without a browser.

## Setup & Commands

```bash
npm install
npm test        # Run simulation unit tests in Node (no browser)
npm run dev     # Start local Vite dev server
npm run build   # Build static production bundle into dist/
```

### Static Deployment (GitHub Pages / itch.io)
`vite.config.ts` sets `base: './'`, so running `npm run build` produces a self-contained static bundle in `dist/` ready to upload to GitHub Pages or itch.io.

## Controls
- **WASD / Arrow Keys**: Move around the island.
- **E / Space** (or **Ask for Food** button): Ask Elder Mara for food when standing nearby (`-5 Karma`, `+35 Hunger`, `+1 Asking` for player, `+1 Trading` for NPC).
- **Red Bramble Thorns**: Step on thorn tiles to take `-4 Health` damage and observe `+1/sec` recovery or lethal death & respawn.
- **Advance +15s**: Simulates 15 seconds of closed-tab elapsed time.
- **Reset Island**: Clears `localStorage` and starts fresh at Generation 1.

## Decisions Made

Where the specification left details open, sensible defaults are isolated in `src/sim/constants.js` for easy tuning:

1. **Hunger Starting Value & Decay Rate**: `INITIAL_HUNGER = 100` and `HUNGER_DECAY_PER_SEC = 2.0` (drops from `100` to `0` in 50 seconds). All RPG stats (`health`, `mana`, `stamina`, talents, and learning stats) start strictly at `0`, while `hunger` is modeled as a survival need (`100 -> 0`) so newborns do not die on frame 1. At `0` hunger, starvation deals `3.0` damage/sec against `+1.0/sec` health growth (net `-2.0 HP/sec`).
2. **Zero Health at Birth vs. Death Condition**: New characters spawn with `0` health and `age = 0`, immediately growing `+1/sec`. Death triggers when `rawHealth <= 0` after taking non-zero damage or starvation (`ageSeconds > 0`), preventing frame-0 mortality.
3. **What Counts as "Asking" & Karma Costs**: Moving within `52px` (~1.6 tiles) of the NPC and pressing `E` or `Space` (or clicking **Ask for Food**) transfers `ASK_FOOD_KARMA_COST = 5` karma from requester to provider, records the debt in `debts[npcId]`, restores `35` hunger, and increments `asking` (`+1`) and `trading` (`+1`). Characters may go into negative karma up to `MAX_KARMA_DEBT = 25`.
4. **Parent-Child Karma Multiplier**: Implemented in `src/sim/karma.js` (`registerBirthKarma` and `feedChild`): birth incurs `BIRTH_KARMA_DEBT = 10`, and each feeding multiplies the owed karma by `CHILD_FEED_KARMA_MULTIPLIER = 2` (`10 -> 20 -> 40`).
5. **Offline Death Respawn Timestamp**: When a player starves while the tab is closed, the new zero-stat character spawns at `nowMs` (return time) rather than looping offline deaths endlessly.
6. **NPC Self-Preservation in Milestone 1**: Since Milestone 1 has one NPC without NPC-to-NPC reproduction yet, Elder Mara automatically forages berries when her hunger drops to `<= 25` (`+40` hunger, `+1 Foraging`), and respawns at zero stats if killed.
7. **Art Style**: Procedural 32×32 retro RPG pixel tiles and 24×24 sprites generated inside `src/phaser/textures.js` with zero external image assets.

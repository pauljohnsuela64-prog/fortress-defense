# Fortress Defense — Phase 1

An original top-down tower defense prototype built with Phaser, TypeScript, and Vite. Place cannon towers beside a winding road and defend the fortress through five waves. All active graphics are original procedural placeholders; no external art or network services are needed during play.

## Setup

Use Node.js 24 LTS (verified with 24.17.0) and npm. From this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). On shells without PowerShell's script restriction, `npm` works in place of `npm.cmd`.

## Play

- Start with 180 gold and 10 lives. Each cannon costs 60 gold.
- Click a grass tile to build; the outlined tile and circle show placement and attack range.
- Path tiles, occupied tiles, and unaffordable purchases are rejected without spending gold.
- Keyboard: focus the battlefield with Tab, move the tile selection with arrow keys, and press Enter to build. Tab to the native Start Wave and Restart buttons to activate them.
- Press **Start Wave** when ready. Towers aim and fire automatically. You may build during waves.
- Kills earn gold. Each enemy reaching the fortress costs one life. Health bars show enemy damage.
- The next wave becomes available only after the current wave's enemies are resolved.
- Clear all five waves with lives remaining to win. Zero lives ends the game. **Restart** resets everything, including an ongoing game.
- A useful opening is towers at columns/rows (3, 4), (5, 6), and (7, 4), counting from 1 at the top left. Spend rewards on more coverage around bends.

## Verify

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

`npm.cmd run test:watch` starts Vitest watch mode. The 12 Vitest tests cover invalid/occupied/path placement, affordability, corners, targeting and cooldown, projectile lifetime, duplicate settlement, wave gating, terminal states, fresh-state reset, a real five-wave winning simulation, and an undefended defeat.

Optional browser smoke test: leave the production preview running at http://127.0.0.1:4173, then in another terminal run:

```powershell
node tests/browser-smoke.mjs
```

This uses locally installed Google Chrome on Windows and Node's built-in WebSocket support. Set `CHROME_PATH` to override the executable path. It opens a hidden browser, checks purchases, blocked placements, wave controls, repeated restart, keyboard building, mobile overflow and runtime exceptions. Screenshots/profile are saved under ignored `.browser-check/`. Port 9223 must be free.

Manual review: watch enemies follow the whole road, inspect projectiles and health bars, finish all waves, deliberately lose without towers, and restart from both end screens. Check touch controls on a physical device.

## Architecture and balancing

- `src/scenes/GameScene.ts`: Phaser rendering, input, HUD and end screens; removes DOM listeners on shutdown.
- `src/gameobjects/Enemy.ts`: waypoint movement, health and terminal status.
- `src/gameobjects/Tower.ts`: in-range targeting and fire cooldown.
- `src/gameobjects/Projectile.ts`: homing attacks and one-time impact.
- `src/WaveManager.ts`: wave counts, timed spawning and completion.
- `src/GameConfig.ts`: dimensions, path, starting resources, tower statistics and wave balance.
- `src/GameState.ts`: purchases, combat orchestration, one-time rewards/life deductions and outcomes.
- `src/main.ts`: Phaser boot and responsive canvas scaling.

The gameplay classes have no Phaser/browser dependency and are exercised directly by Vitest. Frame catch-up is capped to avoid an unseen surge after returning from a background tab.

## Preserved template and scope

The original JavaScript shooter files, `public/` assets and `screenshot.png` are retained as inactive reference. `index.html` now loads only `src/main.ts`. The original Vite configuration and relative deployment base are unchanged. Vite was updated from 5.1.6 to 8.3.7 and Vitest 5.1.0 / TypeScript 5.7.3 added; Phaser remains 3.80.1. The lockfile records exact installed versions.

Phase 1 includes one tower type and five waves. No upgrades, persistence, audio, menus or later-phase features. The build succeeds with a large-chunk warning for the Phaser bundle (about 1.19 MB, 318 KB gzipped). Desktop Chrome was smoke-tested; physical touch devices and other browsers still need manual review.

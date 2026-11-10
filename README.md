# Fortress Defense — Phase 2

An original top-down tower defense game built with Phaser, TypeScript, and Vite. Combine archers, cannons and magic towers, upgrade your defenses and survive five mixed enemy waves. All active graphics are original procedural shapes; no external art, backend or database is required.

## Setup

Use Node.js 24 LTS (verified with 24.17.0) and npm. From this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open Vite's printed local URL (normally http://localhost:5173). Use `npm` instead of `npm.cmd` on shells without PowerShell's script restriction.

## Play

Start with **210 gold and 10 lives**. Choose a tower in the shop, then click or tap grass to build. A green outline shows a valid placement; a red outline means the tile is blocked or you cannot afford the tower. The circle shows attack range. Paths and occupied cells cannot be built on.

| Tower | Cost | Level 1 damage | Attacks/second | Range | Role |
| --- | ---: | ---: | ---: | ---: | --- |
| Archer | 40 | 14 | 2.86 | 150 | Fast, single-target arrows |
| Cannon | 100 | 40 | 0.67 | 165 | Splash damage within 65 pixels, visible blast |
| Magic | 70 | 10 | 1.18 | 145 | Arcane bolts; slows by 40% for 1.6 seconds |

Click or tap a placed tower to inspect its damage, attack speed, range and upgrade price. Upgrade it twice to reach Level 3: damage/range increase, attacks get faster, and max-level towers gain a gold crown/ring. Cannon blast radius and magic slow strength/duration also improve. Upgrade prices (Levels 2 / 3) are Archer **45 / 75**, Cannon **90 / 140**, Magic **65 / 100** gold. Insufficient gold, maximum level and finished battles prevent upgrades.

Magic slow does not multiply across towers: an equal-strength hit refreshes its duration; a stronger hit replaces it; a weaker hit cannot extend a stronger slow. Enemies return to normal speed when the timer expires. A projectile keeps the stats it had when fired; upgrading does not change shots already in flight.

Press **Start Wave** when ready. Towers target and fire automatically, including while you build or upgrade. The wave button is unavailable until all spawned enemies are resolved. Kills earn gold; each escape deducts one life exactly once. Survive wave five to win; zero lives ends the game. **Restart** clears the battlefield, upgrades, effects, selection and wave progress.

Enemy shapes distinguish **normal** (red circle, balanced), **fast** (yellow triangle, low health/high speed) and **tank** (armored gray square, high health/low speed). Violet rings mark slowed enemies. The wave preview names the upcoming enemy types.

Keyboard: Tab to the battlefield, use arrows to select a tile, and press Enter to build or inspect. Escape clears tower selection. Tab also reaches the shop, upgrade, wave and restart buttons. Mobile controls stack below the battlefield; scroll to the shop/panel to change selection or upgrade, then return to the map.

### Tested opening strategy

Coordinates count from 1 at the top-left: Archer at **(3, 4)**, Cannon at **(5, 6)**, Magic at **(7, 4)**. This spends the starting 210 gold. Between waves, upgrade those towers in that order when affordable; before wave four, add a cannon at **(11, 6)** if funds allow. This strategy wins the automated full-game simulations at both 30 and 60 steps per second. Experiment with other placements and upgrade priorities during manual review.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=moderate
npm.cmd run preview -- --host 127.0.0.1
```

`npm.cmd run test:watch` starts Vitest watch mode. The 32 tests cover placement, all three purchase prices, upgrades and caps, shot stat snapshots, splash boundaries and repeated hits, slow refresh/replacement/expiry, movement, kill and escape settlement, mixed wave composition/completion, restart state, terminal effect expiry, full-game victory and undefended defeat. Phase 1 regression tests are retained and adapted to the new balance.

For browser smoke checks, leave the production preview running at http://127.0.0.1:4173, then run in another terminal:

```powershell
node tests/browser-smoke.mjs
```

The test uses local Google Chrome on Windows and Node's built-in WebSocket support. Set `CHROME_PATH` to override Chrome's executable path. Port 9223 must be free. It verifies all shop types, purchase rejection, stats, upgrades, max level, insufficient gold, waves, repeated restart, keyboard placement, emulated touchscreen taps and layouts at 320/390/768/1280px. Screenshots/profile are saved in ignored `.browser-check/`. No test dependency was added.

### Manual review checklist

1. Build each type; inspect its range preview, projectile shape and targeting speed.
2. Place cannons near bends and watch explosions hit groups; place magic nearby and watch violet slow rings appear and expire.
3. Inspect each tower, upgrade to Levels 2 and 3, verify stats/costs and the gold max-level appearance. Try insufficient funds and Level 4.
4. Finish all five waves with a mixed defense; verify fast and tank appearances as they enter later waves.
5. Restart mid-wave with upgraded towers, then play without towers to lose. Restart from both victory and defeat screens.
6. Test on a physical phone/tablet: shop selection, grass placement, inspection, upgrades and scrolling between controls/map.

## Architecture and balancing

- `src/GameConfig.ts`: all tower prices/levels, attack and effect values, enemy stats, wave patterns/health scaling, path and starting resources.
- `src/gameobjects/Tower.ts`: shared targeting/cooldown with three configured types and Levels 1–3.
- `src/gameobjects/Projectile.ts`: homing shots, splash impacts, slow application, explosion data.
- `src/gameobjects/Enemy.ts`: waypoint movement, health, terminal status and exact slow expiry.
- `src/WaveManager.ts`: timed mixed-enemy spawning and completion.
- `src/GameState.ts`: purchases/upgrades, combat, effect lifetime, one-time rewards/life deductions and outcomes.
- `src/scenes/GameScene.ts`: Phaser scene, input, DOM shop/HUD/upgrades and end screens; cleans listeners on shutdown.
- `src/rendering.ts`: original tower/enemy/projectile shapes, level markers and transient effects.
- `src/main.ts`: Phaser boot and responsive scaling.

Logic classes remain browser-independent. UI text only refreshes when displayed state changes. Static terrain is drawn once per scene. Active entities use a shared graphics object; explosions expire and inactive entities are removed. Frame catch-up stays capped to avoid unseen waves after returning from a background tab.

## Scope and limitations

The original inactive JavaScript shooter files, `public/` assets and `screenshot.png` remain untouched as reference. The app loads only `src/main.ts`; the Vite configuration and relative deployment base remain unchanged. No dependencies were added or upgraded in Phase 2. Tracked `.gitignore` now excludes secrets as well as dependencies, build output, coverage and browser artifacts; sanitized `.env.example`/`.env.sample` files remain eligible for version control.

The production bundle still triggers Vite's size warning (about 1.20 MB, 321 KB gzipped, primarily Phaser). Chrome desktop and emulated touch/layout checks are automated; physical touchscreen devices and other browsers remain unverified. Full victory/defeat is tested through real gameplay simulation; complete human playthroughs of the new balance remain part of manual review. No persistence, audio, backend or later-phase features were added.

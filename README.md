# Fortress Defense

An original top-down tower defense game built with Phaser, TypeScript, and Vite. Combine archers, cannons and magic towers, upgrade your defenses and survive five mixed enemy waves. The Oakheart woodland battlefield, character art, interface illustrations and synthesized sounds are original. No external assets, backend or database is required. Phase 2 combat balance is unchanged.

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

Click or tap a placed tower to inspect its damage, attack speed, range and upgrade price. Upgrade it twice to reach Level 3: damage/range increase, attacks get faster, with silver reinforcement at Level 2 and gold trim, flags and rings at Level 3. Cannon blast radius and magic slow strength/duration also improve. Upgrade prices (Levels 2 / 3) are Archer **45 / 75**, Cannon **90 / 140**, Magic **65 / 100** gold. Insufficient gold, maximum level and finished battles prevent upgrades.

Magic slow does not multiply across towers: an equal-strength hit refreshes its duration; a stronger hit replaces it; a weaker hit cannot extend a stronger slow. Enemies return to normal speed when the timer expires. A projectile keeps the stats it had when fired; upgrading does not change shots already in flight.

Press **Start Wave** when ready. Towers target and fire automatically, including while you build or upgrade. The wave button is unavailable until all spawned enemies are resolved. Kills earn gold; each escape deducts one life exactly once. Survive wave five to win; zero lives ends the game. **Restart** clears the battlefield, upgrades, effects, selection and wave progress.

Character silhouettes distinguish **normal** raiders (green hood/red tunic, balanced), **fast** runners (gold hood, low health/high speed) and **tank** enemies (gray helmet/shield, high health/low speed). Violet rings mark slowed enemies. Walking, hit flashes, floating damage/gold numbers and defeat particles are presentation only. The wave preview names the upcoming enemy types.

Keyboard: Tab to the battlefield, use arrows to select a tile, and press Enter to build or inspect. Escape clears tower selection. Tab also reaches the shop, upgrade, wave and restart buttons. Mobile controls stack below the battlefield; scroll to the shop/panel to change selection or upgrade, then return to the map.

### Tested opening strategy

Coordinates count from 1 at the top-left: Archer at **(3, 4)**, Cannon at **(5, 6)**, Magic at **(7, 4)**. This spends the starting 210 gold. Between waves, upgrade those towers in that order when affordable; before wave four, add a cannon at **(11, 6)** if funds allow. This strategy wins the automated full-game simulations at both 30 and 60 steps per second. Experiment with other placements and upgrade priorities during manual review.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=low
npm.cmd run preview -- --host 127.0.0.1
```

`npm.cmd run test:watch` starts Vitest watch mode. The 38 tests cover placement, all three purchase prices, upgrades and caps, shot stat snapshots, splash boundaries and repeated hits, slow refresh/replacement/expiry, movement, kill and escape settlement, mixed wave composition/completion, restart state, terminal effect expiry, full-game victory and undefended defeat. Phase 1/2 regressions remain, with new audio-settings/failure/disposal and bounded-feedback/reset tests. A full-game equivalence test confirms identical combat outcomes with presentation enabled or disabled.

For browser smoke checks, leave the production preview running at http://127.0.0.1:4173, then run in another terminal:

```powershell
node tests/browser-smoke.mjs
```

The test uses local Google Chrome on Windows and Node's built-in WebSocket support. Set `CHROME_PATH` to override Chrome's executable path. Port 9223 must be free. It verifies shop types, purchase rejection, upgrades/caps, waves, keyboard and emulated touchscreen input, audio mute/volume/voice limits, restart cleanup, unavailable sound devices, and reduced-motion behavior. It saves full-page screenshots at 320/390/768/1280px. The actual Phaser frame callback can be advanced in test-only browser instrumentation to check full victory/defeat and the mobile result-screen restart buttons; no production test hooks are added. Screenshots/profile are saved in ignored `.browser-check/`. No test dependency was added.

### Manual review checklist

1. Build each type; inspect its range preview, projectile shape and targeting speed.
2. Place cannons near bends and watch explosions hit groups; place magic nearby and watch violet slow rings appear and expire.
3. Inspect each tower, upgrade to Levels 2 and 3, verify stats/costs and the gold max-level appearance. Try insufficient funds and Level 4.
4. Finish all five waves with a mixed defense; verify fast and tank appearances as they enter later waves.
5. Restart mid-wave with upgraded towers, then play without towers to lose. Restart from both victory and defeat screens.
6. Toggle Sound on/off, change Volume, and restart during active sounds; confirm the setting persists and old sounds stop. Listen to all attack, purchase, upgrade, explosion, defeat and victory cues.
7. Enable the OS reduced-motion preference and confirm decorative motion quiets without changing gameplay.
8. Test on a physical phone/tablet: shop selection, grass placement, inspection, upgrades and scrolling between controls/map.

## Architecture and balancing

- `src/GameConfig.ts`: all tower prices/levels, attack and effect values, enemy stats, wave patterns/health scaling, path and starting resources.
- `src/gameobjects/Tower.ts`: shared targeting/cooldown with three configured types and Levels 1–3.
- `src/gameobjects/Projectile.ts`: homing shots, splash impacts, slow application, explosion data.
- `src/gameobjects/Enemy.ts`: waypoint movement, health, terminal status and exact slow expiry.
- `src/WaveManager.ts`: timed mixed-enemy spawning and completion.
- `src/GameState.ts`: purchases/upgrades, combat, effect lifetime, one-time rewards/life deductions and outcomes.
- `src/scenes/GameScene.ts`: Phaser scene, input, DOM shop/HUD/upgrades and end screens; cleans listeners on shutdown.
- `src/rendering.ts`: original tower/enemy/projectile art, walking/fire/recoil/aura animations and transient effects.
- `src/terrain.ts`: deterministic woodland/stone-road/castle art cached into one texture.
- `src/towerArtwork.ts`: original inline SVG shop illustrations.
- `src/BattleFeedback.ts`: read-only combat observer with pooled particles and floating labels.
- `src/GameAudio.ts`: original Web Audio synthesis, gesture unlock, gain/mute controls, voice limits and cleanup.
- `src/main.ts`: Phaser boot and responsive scaling.

Logic classes remain browser-independent. UI text only refreshes when displayed state changes. Static terrain is generated once per game into a 960?600 texture and reused on restart. Active entities use one graphics object. Feedback reuses 160 particle records and 16 text objects; audio is capped at 12 simultaneous oscillators with per-cue throttling. Shutdown clears feedback and stops voices; final scene destruction closes the audio context. These are bounded-work observations, not a physical-device frame-rate benchmark. Frame catch-up stays capped to avoid unseen waves after returning from a background tab.

## Scope and limitations

The original inactive JavaScript shooter files, `public/` assets and `screenshot.png` remain untouched as reference. The app loads only `src/main.ts`; the Vite configuration and relative deployment base remain unchanged. No dependencies were added or upgraded in Phase 3. Tracked `.gitignore` now excludes secrets as well as dependencies, build output, coverage and browser artifacts; sanitized `.env.example`/`.env.sample` files remain eligible for version control.

The production bundle still triggers Vite's size warning: approximately 1,212.72 KB / 325.57 KB gzip versus Phase 2's 1,198.82 KB / 320.83 KB gzip (about +13.90 KB raw, +4.74 KB gzip). Most of the bundle is Phaser. Chrome desktop and emulated touch/layout checks are automated; physical touchscreen devices, other browsers and subjective audio quality still need manual review. No persistence, music, backend or later-phase gameplay was added.

## Sound and accessibility

Sound unlocks on the first pointer or keyboard gesture. Use **Sound on/off** to mute and the labeled **Volume** slider to adjust output. Settings survive in-game restarts and reset on page reload. A suspended, unavailable or disconnected audio device never blocks gameplay. Sounds use short original oscillator envelopes; there are no audio downloads or copyrighted music. The unused Phaser sound manager is disabled so only one audio context exists.

The OS reduced-motion preference disables walking/aura/recoil animation and particle drawing while leaving combat timing intact. Native controls have visible keyboard focus. Result screens focus the **Defend again** button; restarting returns focus to the battlefield.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` and pull requests targeting `main`. The single `verify` job uses Ubuntu, Node.js 24, read-only repository permissions, SHA-pinned checkout/setup-node actions and a 10-minute timeout. Steps: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and `npm audit --audit-level=low`. Audit still runs after earlier failures unless canceled, and prints an explicit GitHub error annotation for vulnerabilities or registry failures.

Local TypeScript checks, all 38 automated tests, the production build and dependency audit pass. Phase 3 is published on `feat/phase-3-visual-overhaul`. GitHub-hosted CI and merge remain pending pull-request creation; the connected integration currently lacks permission to create the PR.

## Asset provenance

All active Phase 3 terrain, tower/shop illustrations, enemy art, particles and synthesized sound cues were authored in this repository. System fonts are used without remote font downloads. No new third-party asset licenses are required. The preserved inactive template images under `public/` and the old `screenshot.png` are not used by the game; they were not relicensed or modified. Phaser and development-tool licenses remain those supplied by their packages.

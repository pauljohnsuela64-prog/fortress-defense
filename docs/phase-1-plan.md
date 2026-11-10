# Phase 1

Implement the supplied specification in the existing Phaser/Vite project. Preserve the Vite base configuration and retain the unused original JavaScript template as reference. All active gameplay will use TypeScript.

Use a 960 by 600 logical battlefield, a winding grid path, one tower type, and five configurable waves. Phaser renders original geometric graphics; native HTML buttons provide keyboard-accessible wave/restart controls. Arrow keys and Enter also place towers. No external art or new runtime dependencies.

1. Initialize the requested local branch; add TypeScript and Vitest.
2. Write tests for placement, purchases, movement, targeting, damage, rewards, escapes, wave gating, victory, loss, and reset.
3. Implement GameConfig, Enemy, Tower, Projectile, WaveManager and shared GameState without browser dependencies so tests exercise actual gameplay.
4. Connect GameScene and the TypeScript entry point; add HUD, placement preview, controls and end-state overlay.
5. Run type checks, tests, production build, and available browser checks. Document manual checks and commit locally.

Review focus: repeated lethal hits and escape processing must settle once; wave clicks cannot overlap; large movement steps must follow corners; restart must replace state and listeners; placement rejects path, occupied, outside and unaffordable cells.

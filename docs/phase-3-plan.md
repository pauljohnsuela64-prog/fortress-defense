# Phase 3: visual overhaul and CI

Baseline: merged Phase 2 `3d903f066b47c12139ddd5957576dfaddd48c8b8`. Keep all prices, attack values, movement, wave compositions and settlement calculations unchanged.

1. CI first, separate commit: main pushes/PRs, Node 24, npm ci, existing typecheck/test/build scripts, audit with visible failure. Local equivalent passed before visual edits.
2. Original procedural woodland art: warm stone paths, small corner foliage that never blocks a buildable tile, castle, timber archer platforms, reinforced cannons, glowing crystals, level details, walking enemy characters and readable bars. Static terrain drawn once. No generated raster assets or third-party artwork.
3. Presentation feedback observes combat without controlling it. Bounded reused particle/label pools; attack counters only annotate tower fire. Health differences drive flashes, damage/gold labels and defeat effects. Rendering, audio and effects have their own lifetimes and reset cleanup.
4. Original Web Audio synthesis: gesture unlock, muted/volume controls, bounded voices, failure-tolerant playback and disposal. Settings survive restart within the session. No external audio assets or storage dependency.
5. Modern forest/parchment UI: distinct stat badges, illustrated tower cards, selected state, upgrade stats, responsive end-state panel, native accessible controls. Reduced-motion preference quiets decorative animation without changing simulation.
6. Tests first for audio failure/controls/disposal, presentation expiry/limits/reset and unchanged deterministic outcomes. Extend real Chrome smoke for audio controls, restart, end screens and screenshots at 320, 390, 768, 1280 pixels. Verify TypeScript, all tests, build, audit; review code and screenshots; commit locally.

No push, PR, merge, backend, extra dependency or balance change. Report the existing bundle warning and distinguish local verification from unexecuted GitHub-hosted CI.

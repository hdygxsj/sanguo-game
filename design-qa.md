# Agent Arena Design QA

## Evidence

- Source capture: `qa-evidence/source-agent-arena.png` (1329 × 768 physical pixels). The browser chrome occupies the top 137 px; the comparison crop uses the 1329 × 631 page region.
- Implementation desktop: `qa-evidence/implementation-desktop.png` (1280 × 720). In-app Chromium reported a 1280 × 720 CSS viewport at DPR 2.
- Implementation mobile: `qa-evidence/implementation-mobile.png` (390 × 844). Headless Chrome used a 390 × 844 CSS viewport at DPR 1.
- Full comparison: `qa-evidence/comparison-desktop.png`.
- Focused workspace comparison: `qa-evidence/comparison-workspace.png`.
- State under test: authenticated seeded battle, turn 0, live WebSocket connected, WebGL unavailable so the Blender-rendered arena fallback is active.

## Visual assessment

- Typography: compact Chinese sans-serif headings, spaced uppercase metadata, and tabular turn counters reproduce the source hierarchy without clipping at either tested viewport.
- Spacing and composition: the desktop workspace preserves the source's dense left-status / central-arena / right-events topology. The 390 px layout intentionally prioritizes the arena and replay controls, moving secondary panels below the fold.
- Color and surfaces: ink-black canvas, graphite panels, restrained violet borders, lavender primary action, and green connection status match the reference design language.
- Image and 3D quality: the fallback is an original 1280 × 720 Blender render of the same local GLB kit rather than a placeholder. In WebGL-capable browsers the interactive R3F scene uses the eight authored model roots.
- Copy and icons: visible Chinese controls are concise and consistent; icons have accessible button labels and no broken glyphs.
- Responsiveness: desktop and 390 × 844 captures show no horizontal page overflow, overlapping headings, clipped primary controls, or unusable tap targets.
- Accessibility: landmark headings, labelled buttons, a labelled replay slider, visible focus styling, reduced-motion handling, and a DOM-equivalent city-label layer are present.

## Comparison history

1. **P1 — production page rendered blank.** Cause: the static server returned `index.html` for hashed JavaScript. Fixed wildcard static serving; post-fix browser capture renders the complete workspace.
2. **P1 — demo login failed.** Cause: a JSON content type was sent with an empty request body. Fixed the API client to add the header only when a body exists and added a regression test.
3. **P1 — realtime status remained local.** Cause: the WebSocket plugin was registered outside Fastify's plugin lifecycle and upgrade parsing was brittle. Fixed plugin registration plus cookie/query parsing; post-fix UI reports `实时连接`, and an end-to-end socket run received ordered turn events.
4. **P2 — WebGL-disabled browsers showed an empty battlefield.** Added a real Blender-rendered fallback with live DOM city labels and state overlays.
5. **P2 — persistent controls could clip at short desktop heights.** Reworked workspace sizing and the replay/action rows; the 1280 × 720 capture shows all critical controls.
6. **P2 — mobile secondary panels competed with the playfield.** Reordered the responsive layout so the battle title, connection state, arena, and replay remain visible in the first 390 × 844 viewport.

## Final gate

- P0 remaining: 0
- P1 remaining: 0
- P2 remaining: 0
- Expected console noise: the anonymous bootstrap probe returns HTTP 401 before demo login; no uncaught JavaScript or asset errors were observed.

final result: passed

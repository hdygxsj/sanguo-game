# Strategic Armies Implementation Plan

**Goal:** Replace instant troop transfers with persistent distance-based road marching and automatically resolved encounters.

**Architecture:** Army snapshots contain county routes, current edge and normalized progress. Distances are measured in source gameplay coordinates, independent of the display cartogram. Each turn accepts orders first, then advances all armies on a shared time axis; encounters are resolved before later arrivals. Replay snapshots carry armies without changing previous saves.

**Tech Stack:** API TypeScript pure simulation, React/Three.js strategic rendering, Vitest.

## Tasks

- [x] Write failing tests for a long-distance march taking multiple turns, road-route validation, head-on encounters before arrival, army survival after losing the last city, field army wages, and state immutability.
- [x] Add `domain/marching.ts`: shortest road path, distance and weather speed, persistent army creation, continuous same-edge contact detection, automatic field/arrival resolution. Blocked terrain is excluded from routes; more detailed terrain speed modifiers remain for the troop-type layer.
- [x] Extend API/web state with optional armies for legacy saves. Use shared resolver events and existing optimistic persistence. Count field troops in upkeep, utility and elimination.
- [x] Route move/attack orders through marching, keep recruit/develop intact. Reject disconnected destinations. Update obsolete immediate-capture test to simultaneous order semantics.
- [x] Render route-progress army flags on the same transformed city coordinates as the map; show strength/ETA in a collapsible army list, with destination selection. Include SVG fallback markers. Avoid any tactical battle controls.
- [x] Run API/frontend tests and builds; inspect browser map and runtime errors. Preserve existing map geometry, county identity, zoom and selection.

## Evidence 2026-10-08

36 API and 31 frontend tests passed. API/frontend production builds passed after fixing TypeScript optional-array narrowing. Follow-up targeted resolver/map tests passed. Vite's existing large-chunk warning remains.

Created one independent local test campaign through the normal UI, advanced it once, and left its save intact. Two armies visible: Chengdu→Jiangzhou 23%, ETA 4; Shanyin→Wu 41%, ETA 2. Reload retained both. Screenshots checked political view and close terrain view; army panel starts collapsed, destination selection and zoom work. No browser warnings/errors captured. Test browser tab closed; user's tab untouched. Local API restarted with new build (PTY session 7885).

Ran another 100 training episodes, now 500 cumulative. 24 held-out games at a 60-turn horizon: all unresolved, zero genuine wins. Faction balance is NOT achieved. Results and prior checkpoint archived in `data/training-history`.

## Still required for full goal

Historical faction scenario and territories; ruler command controls (the current service still obtains orders from AI); troop composition, leaders, morale/supply, retreat/siege; diplomacy, captives, officers, family/succession and equipment; original portraits and model/art polish; longer-horizon faction-level balance evaluation with uncertainty. Do not report this marching batch as completion of the full game.

## Rules for this batch

March speed defaults to 0.7 geographic world units per turn, slowed by bad weather. Friendly intermediate counties are passed through. Hostile intermediate counties must be conquered; occupation leaves one soldier. At final friendly arrival survivors become the garrison. Field clashes do not receive city defense bonuses. A faction with an army but no city remains alive, receives no city taxes and still owes wages. Equipment, morale, unit composition, retreat and diplomacy are subsequent layers, not claimed implemented here.

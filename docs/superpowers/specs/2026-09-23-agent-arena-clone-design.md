# Agent Arena Clone Design

## Objective

Build a self-contained, locally runnable recreation of the Agent Arena experience at `/agent-arena`, including a functional backend, deterministic turn-based simulation, replayable battles, a responsive React interface, and Blender-authored 3D environment assets.

The implementation must not depend on the source site's backend or hotlink its assets. The public source bundle and source GLB are reference evidence only.

## Reference Evidence

The public site and its frontend bundles establish these observable contracts:

- Dark, purple-accented “Agent 竞技场 / 诸城争霸” shell.
- Battle list, rules, new-battle flow, battle continuation, and turn replay.
- A React-hosted Three.js map.
- A single runtime asset path equivalent to `/models/agent-arena/arena-kit.glb`.
- Eight named Blender groups: `village-a`, `village-b`, `fort`, `citadel`, `stronghold`, `imperial`, `mountain`, and `grove`.
- Programmatic terrain tiles, roads, farmland, ore, flags, weather states, labels, movement, combat, and capture effects.
- Source asset evidence: 57 nodes, 48 meshes, 11 untextured PBR materials, and no baked animation clips.

## Architecture

The repository is a TypeScript workspace with three independently testable units:

1. `apps/web`: Vite, React, React Three Fiber, Drei, Zustand, and CSS Modules/global theme styles.
2. `apps/api`: Fastify, WebSocket support, Prisma, SQLite, Zod, and a deterministic simulation engine.
3. `assets/blender`: a Blender Python generator, editable `.blend` deliverable, and exported GLB.

The renderer never owns authoritative game state. The API owns battles, turns, cities, agents, validation, event ordering, and persistence. The web app renders snapshots and plays sequenced domain events.

## Product Flow

### Authentication

The clone provides a development-safe phone login. A user enters any valid mainland-China mobile number and the fixed development verification code `246810`. No real SMS is sent. Successful login creates an HTTP-only session cookie. A one-click demo-login control is provided for local evaluation.

### Battle List

The `/agent-arena` route opens to a faithful dark shell with title, protocol badge, rules control, battle list control, and new-battle action. Authenticated users see persisted battles with status, participants, current turn, and updated time. A seeded demonstration battle makes the experience useful immediately.

### Battle Creation

New battle creation accepts a title, map size, agent count, and turn limit. The server validates the request, creates deterministic terrain and city state from a seed, assigns agents, stores turn zero, and returns a battle identifier.

### Battle Runtime

Each turn executes on the server:

1. Produce observations for each active agent.
2. Ask each built-in strategy for an action.
3. Validate actions against the same immutable pre-turn snapshot.
4. Resolve economy and movement, then combat and capture.
5. Produce ordered domain events with monotonically increasing sequence numbers.
6. Store the new state snapshot and publish events over WebSocket.

The initial strategies are `expansion`, `defensive`, `economic`, and `balanced`. The runner has a timeout and falls back to `hold` so a broken agent cannot stall a turn.

### Replay

Every turn stores a full compact JSON snapshot plus ordered events. The UI can jump directly to a turn, step backward or forward, and play events. WebSocket reconnection supplies the last seen sequence number and receives missed events.

## Backend Boundaries

- `auth`: verification, session creation, current-user lookup, logout.
- `battles`: create, list, read, delete, and state transitions.
- `simulation`: pure functions for generation, legality, economy, movement, combat, weather, and victory.
- `agents`: strategy implementations and the timeout-safe runner.
- `replay`: snapshots, events, and turn lookup.
- `realtime`: battle subscription and ordered event delivery.

Prisma models cover `User`, `Session`, `Battle`, `Agent`, `Turn`, and `Event`. City state is kept in the versioned turn snapshot to guarantee exact replay and avoid relational drift.

## Frontend Boundaries

- `ArenaShell`: source-faithful navigation and page framing.
- `BattleList`: persisted battle cards and pagination-ready layout.
- `NewBattleDialog`: validated creation flow.
- `RulesDialog`: game rules and controls.
- `BattleWorkspace`: coordinates the scene, HUD, replay, and transport.
- `ArenaScene`: Canvas, lighting, camera rig, tiles, roads, assets, labels, and effects.
- `ArenaHUD`: turn status, playback controls, selected-city details, and agent legend.
- `apiClient` and `battleSocket`: typed network boundaries.
- `battleStore`: UI selection, replay cursor, connection state, and received snapshots; never simulation rules.

## 3D Asset Design

`assets/blender/build_arena.py` generates the eight named asset groups using modular low-poly Chinese architecture primitives: stone plinths, plaster walls, timber beams, tiled hip roofs, gate recesses, towers, courtyards, trees, and faceted rock formations.

The generator creates eleven material slots matching the reference palette: cedar beams, glazed slate jade, ivory plaster, pine foliage, recessed doorways, roof tile edges, sunlit foliage, weathered limestone, imperial amber glaze, mountain moss, and mountain slate.

Conventions:

- One Blender unit equals one meter.
- Z is up in Blender; the glTF exporter produces the expected web orientation.
- Every root object's origin is centered at ground level.
- Object names are stable and lower-case.
- Transforms are applied before export.
- Models use geometry and material color only; no remote textures.
- The build produces `arena-kit.blend` and `apps/web/public/models/agent-arena/arena-kit.glb`.

The original GLB is not shipped.

## Visual Design

The interface uses an ink-black background, graphite panels, restrained violet borders, cool gray text, and bright lavender state accents. The 3D battlefield remains the visual focus. Persistent UI is limited to a compact top bar, a left status cluster, and contextual panels. On mobile, secondary controls collapse into drawers and the Canvas keeps most of the viewport.

Motion is reserved for battle state changes: unit advance, projectile arc, impact burst, capture pulse, and replay transitions. Reduced-motion mode shortens or removes non-essential animation.

## Error Handling

- Invalid REST requests return stable error codes and field details.
- Version-conflicted turn execution returns HTTP 409.
- Agent timeout records a warning event and executes `hold`.
- Turn persistence is transactional; a failure leaves the previous version unchanged.
- WebSocket consumers deduplicate by event sequence and reconnect with exponential backoff.
- A GLB load failure shows a visible scene error instead of an empty Canvas.
- Global frontend errors use a recovery panel with retry.

## Verification

- Unit tests cover deterministic generation, action validation, combat, victory, and all built-in agents.
- API integration tests cover development login, battle creation, battle listing, turn execution, replay, and conflict handling.
- Frontend tests cover shell rendering, dialogs, battle creation, replay controls, and error states.
- The Blender verification script checks root names, material names, transforms, bounds, and successful GLB export.
- Browser QA covers desktop and `390x844` mobile layouts, primary controls, Canvas rendering, WebSocket reconnect behavior, and console errors.
- `design-qa.md` must end with `final result: passed`; all P0-P2 issues must be fixed.

## Deliverables

- Complete source code and lockfile.
- SQLite migrations and deterministic seed data.
- Docker Compose configuration.
- Blender generator and editable `.blend` file.
- Optimized local GLB.
- Automated tests.
- Local run instructions.
- Source/reference notes and design QA report.

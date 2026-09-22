# Agent Arena Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a full-stack local Agent Arena recreation with deterministic battles and Blender-authored 3D assets.

**Architecture:** A pnpm TypeScript workspace contains a Fastify/Prisma API and a Vite/React/R3F web app. Simulation is pure and server-owned; the web app renders stored snapshots and ordered events. Blender generates a stable named GLB contract consumed by the renderer.

**Tech Stack:** TypeScript, pnpm, Vite, React, React Three Fiber, Three.js, Zustand, Fastify, WebSocket, Prisma, SQLite, Zod, Vitest, Testing Library, Playwright-compatible browser QA, Blender Python, glTF 2.0.

---

## File Map

- `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`: workspace configuration.
- `apps/api/src/server.ts`: API composition and startup.
- `apps/api/src/domain/*`: pure simulation types, generation, rules, combat, and agents.
- `apps/api/src/routes/*`: authenticated REST boundaries.
- `apps/api/src/realtime/*`: WebSocket event delivery.
- `apps/api/prisma/schema.prisma`: persistence schema.
- `apps/web/src/app/*`: routing and page composition.
- `apps/web/src/features/*`: auth, battle list, dialogs, battle workspace, and replay.
- `apps/web/src/scene/*`: R3F scene composition and asset contract.
- `apps/web/src/styles/*`: source-faithful visual system and responsive behavior.
- `assets/blender/build_arena.py`: deterministic asset generation and export.
- `assets/blender/verify_arena.py`: Blender-side contract checks.
- `design-qa.md`: visual and interaction gate.

### Task 1: Workspace Baseline

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] Write workspace scripts for `dev`, `build`, `test`, `lint`, `db:setup`, `assets:build`, and `verify`.
- [ ] Initialize the API and web package manifests with pinned compatible dependencies.
- [ ] Install dependencies and verify both packages typecheck from an empty entry point.
- [ ] Initialize Git and commit the design, plan, and workspace baseline.

### Task 2: Pure Simulation Domain (TDD)

**Files:**
- Create: `apps/api/src/domain/types.ts`
- Create: `apps/api/src/domain/generate.ts`
- Create: `apps/api/src/domain/rules.ts`
- Create: `apps/api/src/domain/resolveTurn.ts`
- Test: `apps/api/src/domain/*.test.ts`

- [ ] Write failing tests for seeded map determinism, valid adjacency, blocked terrain, and initial ownership.
- [ ] Implement deterministic map generation and make the tests pass.
- [ ] Write failing tests for recruit, develop, move, attack, hold, invalid ownership, insufficient resources, and stale state versions.
- [ ] Implement action validation and make the tests pass.
- [ ] Write failing tests for combat casualties, capture, economy tick, weather modifiers, and victory.
- [ ] Implement immutable turn resolution and ordered domain events.
- [ ] Run domain tests and commit.

### Task 3: Built-in Agents (TDD)

**Files:**
- Create: `apps/api/src/agents/types.ts`
- Create: `apps/api/src/agents/strategies.ts`
- Create: `apps/api/src/agents/runner.ts`
- Test: `apps/api/src/agents/*.test.ts`

- [ ] Write failing deterministic-choice tests for expansion, defensive, economic, and balanced strategies.
- [ ] Implement strategies using injected seeded randomness.
- [ ] Write a failing timeout/fallback test.
- [ ] Implement the runner with a bounded timeout and `hold` fallback.
- [ ] Run agent tests and commit.

### Task 4: Persistence and Authentication (TDD)

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/db.ts`
- Create: `apps/api/src/auth/service.ts`
- Create: `apps/api/src/auth/plugin.ts`
- Test: `apps/api/src/auth/*.test.ts`

- [ ] Define User, Session, Battle, Agent, Turn, and Event models and create the SQLite migration.
- [ ] Write failing tests for fixed-code login, invalid phone, invalid code, session lookup, and logout.
- [ ] Implement the development auth service with HTTP-only cookies.
- [ ] Run the migration and auth tests, then commit.

### Task 5: Battle REST API (TDD)

**Files:**
- Create: `apps/api/src/routes/battles.ts`
- Create: `apps/api/src/services/battleService.ts`
- Create: `apps/api/src/server.ts`
- Test: `apps/api/src/routes/battles.test.ts`

- [ ] Write failing integration tests for unauthenticated access, list, create, read, execute turn, replay, and optimistic-version conflict.
- [ ] Implement schemas and the battle service with transactional turn persistence.
- [ ] Implement REST routes and stable error envelopes.
- [ ] Seed a demonstration user and battle.
- [ ] Run API tests and commit.

### Task 6: Realtime Gateway (TDD)

**Files:**
- Create: `apps/api/src/realtime/gateway.ts`
- Create: `apps/api/src/realtime/eventBus.ts`
- Test: `apps/api/src/realtime/*.test.ts`

- [ ] Write failing tests for subscribe, ordered publication, deduplication, and missed-event replay.
- [ ] Implement the in-process event bus and authenticated WebSocket gateway.
- [ ] Publish committed turn events only after the database transaction succeeds.
- [ ] Run realtime tests and commit.

### Task 7: Blender Asset Generator

**Files:**
- Create: `assets/blender/build_arena.py`
- Create: `assets/blender/verify_arena.py`
- Generate: `assets/blender/arena-kit.blend`
- Generate: `apps/web/public/models/agent-arena/arena-kit.glb`

- [ ] Install Blender if it is unavailable and record the executable path.
- [ ] Implement reusable material, wall, beam, roof, gate, tower, tree, and rock builders.
- [ ] Compose the eight required named root groups with increasing settlement complexity.
- [ ] Save the editable `.blend` and export GLB with applied transforms.
- [ ] Implement and run the Blender verification script for names, materials, bounds, and transforms.
- [ ] Inspect the exported GLB and commit the scripts and generated assets.

### Task 8: Web Shell and Auth (TDD)

**Files:**
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/App.tsx`
- Create: `apps/web/src/features/auth/*`
- Create: `apps/web/src/styles/theme.css`
- Create: `apps/web/src/styles/app.css`
- Test: `apps/web/src/features/auth/*.test.tsx`

- [ ] Write failing tests for the source-faithful shell, demo login, phone login validation, and auth error state.
- [ ] Implement routing, API client, theme tokens, shell, and login UI.
- [ ] Verify keyboard focus and mobile layout.
- [ ] Run frontend tests and commit.

### Task 9: Battle List, Rules, and Creation (TDD)

**Files:**
- Create: `apps/web/src/features/battles/BattleList.tsx`
- Create: `apps/web/src/features/battles/NewBattleDialog.tsx`
- Create: `apps/web/src/features/battles/RulesDialog.tsx`
- Create: `apps/web/src/features/battles/battles.css`
- Test: `apps/web/src/features/battles/*.test.tsx`

- [ ] Write failing tests for empty/list/loading states, rules open/close, creation validation, and successful navigation.
- [ ] Implement the battle list and dialogs against the typed API.
- [ ] Match captured desktop and mobile spacing, color, typography, and control states.
- [ ] Run tests and commit.

### Task 10: R3F Battlefield

**Files:**
- Create: `apps/web/src/scene/ArenaScene.tsx`
- Create: `apps/web/src/scene/ArenaAsset.tsx`
- Create: `apps/web/src/scene/TerrainTile.tsx`
- Create: `apps/web/src/scene/City.tsx`
- Create: `apps/web/src/scene/BattleEffects.tsx`
- Create: `apps/web/src/scene/assetManifest.ts`
- Test: `apps/web/src/scene/*.test.tsx`

- [ ] Write contract tests for required GLB node names and asset-manifest mapping.
- [ ] Implement the Canvas, orthographic camera rig, lighting, shadows, roads, procedural terrain, farmland, ore, weather, and stable GLB instances.
- [ ] Implement pointer selection with DOM city labels and keyboard-accessible equivalents.
- [ ] Implement movement, projectile, impact, and capture playback from ordered events.
- [ ] Add reduced-motion behavior and explicit asset-load failure UI.
- [ ] Run scene tests and commit.

### Task 11: Battle Workspace and Replay (TDD)

**Files:**
- Create: `apps/web/src/features/arena/BattleWorkspace.tsx`
- Create: `apps/web/src/features/arena/ArenaHUD.tsx`
- Create: `apps/web/src/features/arena/battleStore.ts`
- Create: `apps/web/src/lib/battleSocket.ts`
- Test: `apps/web/src/features/arena/*.test.tsx`

- [ ] Write failing tests for snapshot load, city selection, turn execution, replay navigation, deduplication, reconnect, and terminal battle state.
- [ ] Implement the store and typed transport boundaries.
- [ ] Implement the compact HUD, selected-city panel, agent legend, and replay controls.
- [ ] Integrate the R3F scene without putting simulation logic in React.
- [ ] Run tests and commit.

### Task 12: Packaging and Full Verification

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `scripts/verify.mjs`
- Create: `design-qa.md`
- Modify: `README.md`

- [ ] Add portable local development and Docker startup paths.
- [ ] Run lint, typecheck, unit tests, integration tests, production builds, database setup, and Blender asset verification.
- [ ] Start the full stack and verify login, create battle, execute turn, replay, reload persistence, and WebSocket recovery.
- [ ] Capture desktop and `390x844` mobile states and compare against source evidence.
- [ ] Fix all P0-P2 findings and record the final result in `design-qa.md`.
- [ ] Keep the verified local preview running and commit the final state.

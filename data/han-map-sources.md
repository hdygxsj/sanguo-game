# Han map data and training provenance

## Coverage and limits

The map imports the full administrative list in the Eastern Han administrative divisions article: **13 provinces, 105 commanderies/kingdoms/dependencies, 1,184 county-level units**. County-level units include counties, marquisates, estates and tribal districts. They retain their source names and parent commandery, including names shared by different commanderies. Each reported commandery count matches its imported child count.

Source: [Eastern Han administrative divisions](https://zh.wikipedia.org/w/index.php?title=东汉行政区划&oldid=92993273), accessed 2026-10-07. The source references the geographical treatises in the *Book of Later Han*. Attribution: Wikipedia contributors; source compilation CC BY-SA 4.0. Extracted facts and generated register are in `apps/api/src/domain/hanRegister.ts`; extraction is reproducible with `python3 scripts/import-han-counties.py SOURCE.html`.

This is **not a verified AD 190 administrative time slice**. The map adopts a late Han setting, without imposing historical armies or scripted events. Some names and affiliations in the source reflect other Eastern Han dates. Commandery centres are manually approximated; county positions are deterministic schematic placements within their commandery, not surveyed ancient county seats. Roads are a game graph, not a historical road survey. These limitations are visible in the map's information panel and county detail panel. No claim is made to reconstruct exact historical boundaries. The terrain outline includes the theatre's historical peripheral areas and is not a modern national boundary.

CHGIS was investigated but its general site restricts redistribution/commercial usage; no CHGIS dataset is bundled. Geographic context was cross-checked against [ANU's historical study with late Han maps](https://openresearch-repository.anu.edu.au/server/api/core/bitstreams/fcf6cff2-9d85-4b28-add3-f9b4baddc9fd/content). The geographic outline, rivers and mountain range geometry are original stylized drawings.

## Learning

Run `pnpm --filter @agent-arena/api train 100`, or use the authenticated lobby's **训练 100 局** button. Training runs locally on CPU and atomically saves `data/learned-policy.json`. It uses linear Q-learning with 12 state/action features, epsilon-greedy exploration, and temporal-difference updates from actual simulation transitions. Features represent recruitment, development, attack advantage, potential capture and frontline transfers. Training rotates the learner across four starting seats, mixes rule opponents and a frozen learned opponent, and yields between episodes to keep the API responsive.

A first run bootstraps against rule opponents; subsequent runs include self-play against the previous checkpoint. A checkpoint contains weights, total episodes, timestamp and evaluation. New battles pin a full checkpoint in their snapshot; later training cannot silently alter an existing battle or replay. When no trained file exists, new battles transparently use the existing rule strategies.

Evaluation uses 24 held-out map seeds, rotates seats, and compares the learned player against the same rule opponents as a rule-player control. County-count ties receive fractional credit. This is a small benchmark against simple policies, **not proof of general intelligence or superiority to a human**. Every training call evaluates its final checkpoint and publishes the measured result, without a guaranteed improvement claim.

## Strategic display (2026-10-07)

The default display is now a unified R3F orthographic scene: zoom continuously blends a political atlas into a shared height-field landscape. County Voronoi cells are clipped to the coastline, with heavier commandery borders. These are **gameplay display regions, not historical administrative boundaries**. Neutral cells use a common earth tone; live/replayed ownership supplies a display-only mineral pigment palette. The compact projection changes display coordinates only. SVG is retained as the WebGL fallback.

`apps/web/src/arena/mapTransition.ts` configures overlapping zoom ranges: relief 1.3–5.4×, city models 2.2–5.6×, political fill 1.4–6.4× and shadows 3.8–6.5×. GLB loading starts at 1.6×; loading readiness has its own damped crossfade. Terrain vertices, icon/model anchors and roads sample the same triangulated height field. Models retain constant world scale while the ground itself changes relief and material. Mountains/rivers are schematic; the generated terrain is not an elevation survey. Horse pastures remain scenic landmarks, not a new gameplay resource.

Mountain ridges and rivers use the existing stylized geography. Farmland and ore landmarks read saved terrain/resource values. Northern horse-pasture landmarks are deterministic scenic markers for existing saves; they do not add resource income or an independent cavalry-production system. The expanded map uses the same continuous 3D scene. The model-free SVG fallback retains its own flat minimap and layer controls; legacy grid battles retain their original renderer.

Visual interaction reference: [Total War Academy — Three Kingdoms](https://academy.totalwar.com/three-kingdoms/), particularly the campaign/commandery organization. No game artwork, models or copyrighted map assets are copied.

## Automated coverage

Tests cover source completeness, duplicate identities, land containment, symmetric connected traversal, legal learned actions, actual weight updates, and same-turn ownership revalidation. Existing API, replay and frontend tests continue to run. New maps use all 1,184 counties as simulation nodes; older saved grid games remain replayable.

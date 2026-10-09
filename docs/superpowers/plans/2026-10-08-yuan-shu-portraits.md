# Yuan Shu faction portraits implementation plan

**Goal:** Add three distinct original adult portraits for Yuan Shu, Ji Ling and Yan Xiang. This is one increment toward all-character artwork, not completion of the wider game.

**Architecture:** Preserve CharacterPortrait's name mapping, lazy loading, adult gate and explicit fallback. Store original PNGs in assets/portraits and JPEG derivatives in the existing public portrait directory. No gameplay or save changes.

**Tech Stack:** Built-in image generation, sips JPEG conversion, React, Vitest, Vite.

Design: retain parchment background, waist-up framing, realistic painterly faces, ink-wash edges and subdued Han-inspired clothing. Yuan Shu is an affluent middle-aged ruler in muted gold-brown; Ji Ling a broad-faced veteran in worn lamellar armor; Yan Xiang an older restrained scholar in grey-green. These are artistic interpretations, not claimed authentic likenesses. Reusing existing faces would not satisfy distinct artwork; original generation is selected. User requested autonomous execution without questions.

- [x] Generate each image separately with recorded prompts; inspect full frames for anatomy, differentiation and absence of text.
- [x] Add test rows `['袁术','yuan-shu'],['纪灵','ji-ling'],['阎象','yan-xiang']` to CharacterPortrait.test.tsx; run `pnpm --filter @agent-arena/web exec vitest run src/CharacterPortrait.test.tsx` and observe missing-image failures.
- [x] Copy masters into assets/portraits; use `sips -s format jpeg -s formatOptions 80 SOURCE --out DESTINATION` without cropping or resizing.
- [x] Add mappings `'袁术':'yuan-shu-v1','纪灵':'ji-ling-v1','阎象':'yan-xiang-v1'` in CharacterPortrait.tsx.
- [x] Run portrait tests and production build, verify HTTP content matches each shipping file, update README count and evidence.

No commit or new worktree: preserve current shared dirty implementation and user's existing work.

Verification: three new tests failed for missing image roles before mapping; then full suite passed 252 tests (166 API + 86 web), including all 19 portrait tests. Production build passed with existing large-chunk warning. All three shipping JPEGs are 1024×1536, HTTP 200, byte-identical to disk: Yuan Shu 476857 bytes, Ji Ling 482279 bytes, Yan Xiang 429103 bytes. Image generation output visually reviewed; this increment does not claim browser personnel-panel visual inspection. Originals and full prompts retained in assets/portraits. Total original portraits now 21; remaining character artwork and wider gameplay/balance scope are still incomplete.

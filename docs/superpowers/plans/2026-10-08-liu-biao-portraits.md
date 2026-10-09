# Liu Biao faction portraits

Added original built-in image_gen portraits for Liu Biao, Kuai Liang and Lady Cai. Full prompts and local artifact locations: assets/portraits/liu-biao-prompts.md. Inspected all generated images: distinct single-person compositions, complete headpieces, no text, restrained painterly/ink palette. All PNG masters retained, JPEG quality 80 without resize/crop.

Added three initially failing component mapping cases, then integrated filenames. Full 246 tests (164 API, 82 web) and production build passed. HTTP checks returned 200 and exact on-disk byte matches: Liu Biao 481454, Kuai Liang 514931, Lady Cai 431875 bytes. Total unique character art now 18, not full roster coverage. Existing minor/fallback/lazy loading behavior unchanged.

Parallel training session 26599 completed normally, archive data/training-history/run-1791443374153-203-558.json. Candidate 55.875 mean counties vs incumbent 66.25, zero wins/100% unresolved, rejected for territorial-regression. Active checkpoint remains 542 episodes. No live training process from this run. Keep broad goal active: artwork coverage and actual faction victory balance remain incomplete.

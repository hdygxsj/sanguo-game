# Continuous reinforcement orders

Problem: rear troops received one county hop per order despite the existing multi-leg marching engine. Every arrival consumed another future strategic action to continue.

Change: propagate destination frontier through existing friendly BFS. Use actual roadRoute to dispatch directly if every route county remains friendly; otherwise retain one-hop fallback. Respect existing inbound destination exclusion. No teleportation, changed speed, new action type or gameplay rule.

Tests: updated frontier/inbound expectations failed first, then passed. Added actual turn resolution showing route [0,1,2] and troops still on the road after one turn; neutral-shortcut fixture verifies fallback. Campaign suite 14 passed. Before those two additional tests, full suite 237 and build passed.

Paired diagnostic, checkpoint 542, seed 201, 500 turns:

| Metric | Before | After |
|---|---:|---:|
| Hold orders | 201 | 53 |
| Attack orders | 3303 | 3599 |
| Move orders | 651 | 622 |
| Captures | 3189 | 3522 |
| Recaptures within 10 turns | 741 | 796 |
| Largest realm | 163 | 168 |
| Surviving factions | 12 | 14 |
| Actual winner | None | None |

Interpretation: fewer idle turns and improved movement continuity, not demonstrated victory balance. Post-change large cash balances and repeated conquests remain unresolved. Do not claim completion or promote a new checkpoint without held-out evaluation.

Final full verification: 239 tests and production build passed. Training launched with seed 202, 16 episodes, 240 learning turns and 120 evaluation turns. Process session 49991 was still live at the last check; do not launch a duplicate while that process runs. Local serving backend still needs restart to pick up campaign changes after training verification.

Serving update: resolved port 8787 to PID 98766 (`node dist/index.js`, API project cwd), terminated only that process and restarted built API as session 12808, PID 20058. `/api/health` returned status ok. No database writes or turn advancement performed.

Training session 49991 subsequently completed with exit 0. Archive `data/training-history/run-1791442573237-202-558.json`: candidate mean counties 64.1875 versus freshly evaluated incumbent 62.6875 (about +2.4%). Both recorded zero unification wins and 100% unresolved in the 120-turn evaluation. Promotion rejected as `no-demonstrated-improvement`; active checkpoint remains 542 episodes. No training process remains live for this run. This is evidence of a modest territorial change, not proof of the requested all-faction victory opportunity.

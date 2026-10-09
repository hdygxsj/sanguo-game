# Siege weather casualty correction

Long baseline diagnostic: seed 201, active 542-episode policy, continuous reinforcement enabled, 2500 turns. Completed with no winner, 12 survivors, largest final realm 353 counties (peak at sampled turns 418), 15710 captures and 5115 recaptures within 10 turns. Session 16454 exited normally. This disproves the assumption that merely extending the short evaluation necessarily resolves the stalemate.

Code investigation found a separate combat accounting defect: attack power included weather efficiency, but winning survivors divided by commander/unit efficiency alone. An empty rainy county therefore reduced 20 attackers to 17 despite zero defending troops. Failing regression confirmed this before the fix.

Use the same combined weather/commander/unit multiplier to convert surviving power back into troops. Empty-target troop count is conserved across clear/rain/snow/fog/blizzard. A defended siege still yields 9 survivors in clear weather versus 7 in rain for the controlled 20-vs-10 fixture. Marching speed, routing, upkeep, desertion and battle outcome threshold remain unchanged.

Full verification: 241 tests (162 API, 79 web) and production build pass. Serving backend restarted from verified API process PID 20058 to session 7342; health endpoint returns ok.

Post-fix seed-201/500-turn diagnostic: 3599 attacks, 53 holds, 3522 captures, 796 short recaptures, 14 survivors, largest realm 168, no winner. These aggregates are identical to the pre-fix 500-turn baseline; no balance improvement is claimed. The fix is justified by the controlled weather regressions, not the long campaign's outcome. No live diagnostic or training process remains from this turn.

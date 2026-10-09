# Occupation readiness

Evidence: seed 201 baseline at 500 turns had 3522 captures and 796 recaptures within 10 turns; 2500-turn baseline had 15710/5115 and no winner. Existing attack checks cover defeating the target and guarding the departure county, but not defending the conquest.

Reproduced with 60 attackers at home, a 2-troop target and its adjacent 80-troop hostile county: planner approved a doomed occupation, while recruitment offered no reinforcement. Both new regressions failed before implementation.

Implementation: calculate actual siege survivors using the same weather/counter/commander efficiency as combat. Compare their unit composition at the captured county against hostile neighbouring garrisons using the shared flank guard estimator. Recruitment includes the corresponding occupation reserve and departure retention in its funded target. Stationary neutral counties remain excluded from counterattack threats. No economic discounts or changed combat outcomes.

Verification: 243 tests (164 API, 79 web) and build pass. Same-seed 500-turn comparison completed (session 50425, exit 0): 2820 captures versus 3522, 318 short recaptures versus 796 (11.3% versus 22.6%), largest realm 200 versus 168. Attacks 2892 versus 3599, moves 765 versus 622, holds 679 versus 53. Both runs retain 14 factions and have no winner. Fewer wasted conquests and larger consolidation, but increased waiting remains a clear tradeoff needing logistics/learning work. No claim of all-faction victory balance.

Deployment: verified API listener PID 22894 and cwd, restarted only that process as session 19264; health returns ok. New training seed 203, 16 episodes, learning horizon 240/evaluation 120 started as session 26599; confirmed running on launch, no outcome yet. Do not launch another copy before inspecting this handle.

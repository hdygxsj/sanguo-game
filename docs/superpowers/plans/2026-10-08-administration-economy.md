# Administration economy

Goal: give broad expansion an economic cost and make the budget visible before orders.

Evidence: deterministic 500-turn all-learned scenario produces 7,510–56,195 treasury while issuing at most one faction command per turn. County tax scales linearly; no governing-size loss exists. This change addresses the income side, not the still-incomplete AI investment/strategic planning.

Design: first 16 counties exempt; thereafter taxable gross county revenue loses `floor(gross * .75 * (count-16)/(count+24))`. This grows continuously toward 75%, never reaches it, and never makes revenue negative. Shared `fiscalEstimate` returns grossRevenue, administrationLoss, revenue after loss, upkeep and net. Personnel governance income and trade stay separately accounted. Buildings continue improving gross tax. No stored tax migration or retroactive treasury confiscation. Display estimated complete turn balance in the existing command drawer and explain loss in income events.

- [x] Tests for small-state exemption, growing loss, building returns and fiscal identities.
- [x] Implement shared formula and settlement event detail.
- [x] UI budget test and breakdown in RulerCommands using shared fiscal/personnel/trade calculations.
- [x] Full tests/build and same-seed long-run diagnostic. Treat initial formula as a balance candidate, not proven fairness.

Verification: three fiscal tests and one UI test failed before implementation; full 128 API + 55 web = 183 tests passed afterward. Build and whitespace checks passed; existing battle chunk warning is 1,041.07 kB. API restarted.

Browser QA: existing agent-created turn-22 save (no turn advanced) displayed treasury 271, 15 counties and net +17. Expanded details showed gross/received tax 57, administration loss 0, city upkeep 17, army wages 18, salaries 5, governor/trade revenue 0; arithmetic matches. Screenshot inspected at 1280×720, budget disclosure remains in scrollable right drawer with central map unobstructed. Console warn/error empty; temporary tab closed.

Diagnostic `diagnostic-192`, 500 turns, same active 510-episode policy: all 16 factions active, no winner; treasury range 20–9525 vs previous 7510–56195; attacks 3744 vs 3688, hold orders 356 vs 762. Every faction had a hostile frontier at the end. This supports stronger financial constraint in one trajectory only, not cross-seed balance. No training/promotion performed; growth penalties need further evaluation and AI must learn to invest in profitable buildings.

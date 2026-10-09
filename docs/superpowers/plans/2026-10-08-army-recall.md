# Halted army recall

Confirmed missing path: diplomacy can halt an army at a peaceful border, but no player or AI order could recover it. Added recall-army action through API schema, shared validation, turn resolution, AI campaign options and player command panel.

Scope: halted owned armies only, previous road node must still be owned. Reverse the current edge and set progress to 1-progress; normal movement, encounters, payroll and arrival continue. No teleportation, troop creation, treaty violation or free extra turn. Unsafe retreat to a lost node is rejected. General arbitrary redirection remains future work.

Tests were observed failing before implementation. Full suite and build passed (179 API + 126 web = 305 tests). Tests cover owned recall, road travel, troop composition, immutable input state, unsafe/foreign rejection, AI recovery priority and player submission.

Local API reloaded with the existing apps/api/prisma/dev.db; health endpoint returned ok. No saved campaign turn advanced for verification.

Training session 41000 started before this feature and retains its already imported code. Its results must not be attributed to recall support; next training run should include it.

## Integration follow-up

306 tests passed (180 API + 126 web). Added real HTTP schema/turn/replay coverage using only the isolated test database: recall accepted, reversed route persisted, missing-army command rejected without version advancement. Extended simulation test through final arrival and 50-troop home garrison, and UI test for disabled submission state. Live user saves were not changed.

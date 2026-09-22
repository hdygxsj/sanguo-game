import type { AgentState, BattleAction, BattleState } from '../domain/types.js';
import { chooseAction } from './strategies.js';

export interface AgentRunResult {
  action: BattleAction;
  timedOut: boolean;
}

export type AgentStrategy = (state: BattleState, agent: AgentState) => BattleAction | Promise<BattleAction>;

export async function runAgent(
  state: BattleState,
  agent: AgentState,
  strategy: AgentStrategy = chooseAction,
  timeoutMs = 500,
): Promise<AgentRunResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AgentRunResult>((resolve) => {
    timer = setTimeout(() => resolve({ action: { type: 'hold' }, timedOut: true }), timeoutMs);
  });
  const execution = Promise.resolve(strategy(state, agent))
    .then((action) => ({ action, timedOut: false }))
    .catch(() => ({ action: { type: 'hold' } as const, timedOut: false }));

  const result = await Promise.race([execution, timeout]);
  if (timer) clearTimeout(timer);
  return result;
}

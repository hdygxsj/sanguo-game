import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { BattleWorkspace } from './BattleWorkspace';
import type { BattleDetail } from './types';

vi.mock('./arena/ArenaScene', () => ({ ArenaScene: () => <div data-testid="arena-canvas" /> }));

const battle: BattleDetail = {
  id: 'battle-1', title: '群雄逐鹿', seed: 'seed', status: 'active', currentTurn: 0, maxTurns: 30,
  columns: 5, rows: 4, version: 0, updatedAt: new Date().toISOString(),
  agents: [
    { id: 'a1-record', agentKey: 'agent-1', name: 'Agent A', color: '#7257ff', strategy: 'expansion', active: true },
    { id: 'a2-record', agentKey: 'agent-2', name: 'Agent B', color: '#e05472', strategy: 'defensive', active: true },
  ],
  state: {
    seed: 'seed', version: 0, turn: 0, maxTurns: 30, columns: 5, rows: 4, status: 'active', winner: null,
    agents: [
      { id: 'agent-1', name: 'Agent A', color: '#7257ff', strategy: 'expansion', active: true },
      { id: 'agent-2', name: 'Agent B', color: '#e05472', strategy: 'defensive', active: true },
    ],
    resources: { 'agent-1': 20, 'agent-2': 20 },
    cities: [],
  },
};

describe('battle workspace', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getBattle').mockResolvedValue({ battle });
  });

  it('renders the realtime battlefield controls and agents', async () => {
    render(<BattleWorkspace battleId="battle-1" onBack={() => undefined} />);

    expect(await screen.findByText('群雄逐鹿')).toBeInTheDocument();
    expect(screen.getByTestId('arena-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '推进一回合' })).toBeInTheDocument();
    expect(screen.getByText('Agent A')).toBeInTheDocument();
    expect(screen.getByText('Agent B')).toBeInTheDocument();
  });
});

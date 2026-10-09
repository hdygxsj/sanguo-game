import type { BattleDetail, BattleState, BattleSummary, CreateBattleInput, DomainEvent, User, PlayerOrder } from './types';
import {simplifyPresentation} from './simplified';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: Object.fromEntries(headers.entries()),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  if (!response.ok) {
    if(payload.error?.code==='NO_ROAD_ROUTE')throw new ApiError(response.status,'NO_ROAD_ROUTE','无法到达：道路可能受陡坡或外交边界阻挡，请选择其他目标。');
    throw new ApiError(response.status, payload.error?.code ?? 'REQUEST_FAILED', payload.error?.message ?? '请求失败');
  }
  return simplifyPresentation(payload) as T;
}

export const api = {
  me: () => request<{ user: User }>('/api/auth/me'),
  demoLogin: () => request<{ user: User }>('/api/auth/demo-login', { method: 'POST' }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  listBattles: () => request<{ battles: BattleSummary[] }>('/api/battles'),
  createBattle: (input: CreateBattleInput) => request<{ battle: BattleSummary }>('/api/battles', { method: 'POST', body: JSON.stringify(input) }),
  getBattle: (id: string) => request<{ battle: BattleDetail }>(`/api/battles/${id}`),
  executeTurn: (id: string, expectedVersion: number, order?:PlayerOrder) => request<{ state: BattleState; events: DomainEvent[] }>(`/api/battles/${id}/turns`, { method: 'POST', body: JSON.stringify({ expectedVersion,order }) }),
  replay: (id: string, turn: number) => request<{ snapshot: BattleState; events: DomainEvent[] }>(`/api/battles/${id}/replay?turn=${turn}`),
};

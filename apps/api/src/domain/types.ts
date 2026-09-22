export type Terrain = 'plain' | 'farmland' | 'mine' | 'blocked';
export type Weather = 'clear' | 'rain' | 'snow' | 'blizzard' | 'fog';
export type Strategy = 'expansion' | 'defensive' | 'economic' | 'balanced';

export interface AgentState {
  id: string;
  name: string;
  color: string;
  strategy: Strategy;
  active: boolean;
}

export interface CityState {
  id: number;
  name: string;
  x: number;
  z: number;
  adjacent: number[];
  terrain: Terrain;
  weather: Weather;
  resourceTrait: 'granary' | 'ore-vein' | null;
  owner: string | null;
  troops: number;
  level: number;
  defenseMultiplier: number;
  imperial: boolean;
}

export interface BattleState {
  seed: string;
  version: number;
  turn: number;
  maxTurns: number;
  columns: number;
  rows: number;
  status: 'active' | 'completed';
  winner: string | null;
  agents: AgentState[];
  resources: Record<string, number>;
  cities: CityState[];
}

export type BattleAction =
  | { type: 'hold' }
  | { type: 'recruit'; cityId: number; amount: number }
  | { type: 'develop'; cityId: number }
  | { type: 'move'; fromCityId: number; toCityId: number; troops: number }
  | { type: 'attack'; fromCityId: number; toCityId: number; troops: number };

export interface AgentAction {
  agentId: string;
  action: BattleAction;
}

export type EventType =
  | 'turn-start'
  | 'hold'
  | 'recruit'
  | 'develop'
  | 'move'
  | 'attack'
  | 'capture'
  | 'invalid-action'
  | 'income'
  | 'victory'
  | 'turn-end'
  | 'agent-timeout';

export interface DomainEvent {
  sequence: number;
  turn: number;
  type: EventType;
  agentId?: string;
  cityId?: number;
  fromCityId?: number;
  toCityId?: number;
  amount?: number;
  message: string;
}

export interface TurnResult {
  state: BattleState;
  events: DomainEvent[];
}

export type ValidationResult = { ok: true } | { ok: false; code: string };

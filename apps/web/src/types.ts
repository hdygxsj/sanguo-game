export type Terrain = 'plain' | 'farmland' | 'mine' | 'blocked';
export type Weather = 'clear' | 'rain' | 'snow' | 'blizzard' | 'fog';
export type Strategy = 'expansion' | 'defensive' | 'economic' | 'balanced';

export interface User {
  id: string;
  phone: string;
  displayName: string;
}

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

export interface DomainEvent {
  sequence: number;
  turn: number;
  type: string;
  agentId?: string;
  cityId?: number;
  fromCityId?: number;
  toCityId?: number;
  amount?: number;
  message: string;
}

export interface BattleAgentRecord {
  id: string;
  agentKey: string;
  name: string;
  color: string;
  strategy: Strategy;
  active: boolean;
}

export interface BattleSummary {
  id: string;
  title: string;
  seed: string;
  status: 'active' | 'completed';
  currentTurn: number;
  maxTurns: number;
  columns: number;
  rows: number;
  version: number;
  updatedAt: string;
  agents: BattleAgentRecord[];
}

export interface BattleDetail extends BattleSummary {
  state: BattleState;
}

export interface CreateBattleInput {
  title: string;
  columns: number;
  rows: number;
  agentCount: number;
  maxTurns: number;
}

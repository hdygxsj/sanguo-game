export type Terrain = 'plain' | 'farmland' | 'mine' | 'blocked';
export type Weather = 'clear' | 'rain' | 'snow' | 'blizzard' | 'fog';
export type Strategy = 'expansion' | 'defensive' | 'economic' | 'balanced';
type UnitType='spear'|'sword'|'archer'|'cavalry';

export interface User {
  id: string;
  phone: string;
  displayName: string;
}

export interface AgentState {
  startingCityId?:number;
  id: string;
  name: string;
  color: string;
  strategy: Strategy;
  active: boolean;
}

export interface CityState {
  siteKind?: 'city'|'farm'|'mine'|'horse';
  buildings?: Partial<Record<'farm'|'market'|'barracks',number>>;
  construction?: {building:'farm'|'market'|'barracks';level:number;completesTurn:number};
  units?:Partial<Record<import('../../api/src/domain/types').UnitType,number>>;
  province?: string;
  commandery?: string;
  commanderyId?: number;
  seat?: boolean;
  coordinateQuality?: 'schematic';
  id: number;
  name: string;
  x: number;
  z: number;
  adjacent: number[];
  terrain: Terrain;
  weather: Weather;
  resourceTrait: 'granary' | 'ore-vein' | 'horse-pasture' | null;
  owner: string | null;
  troops: number;
  level: number;
  defenseMultiplier: number;
  imperial: boolean;
}

export interface BattleState {
  polities?:Record<string,import('../../api/src/domain/types').PolityState>;
  victoryReason?:'kingdom'|'conquest';
  court?: Record<string,Partial<Record<import('../../api/src/domain/types').CourtOffice,string>>>;
  unions?: import('../../api/src/domain/types').FamilyUnion[];
  equipment?: import('../../api/src/domain/types').EquipmentItem[];
  characters?: import('../../api/src/domain/types').CharacterState[];
  diplomacy?: Record<string,DiplomaticRelation>;
  diplomaticOffers?: DiplomaticOffer[];
  playerAgentId?: string;
  armies?: ArmyState[];
  map?: HistoricalMap;
  policy?: LearnedPolicy;
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
  | {type:'raise-army';cityId:number;commanderId?:string}
  | {type:'order-army';armyId:string;toCityId:number;stopProgress?:number}
  | {type:'army-stance';armyId:string;stance:'camp'|'ambush'}
  | {type:'recruit-army';armyId:string;amount:number;unitType?:UnitType}
  | {type:'found-kingdom';name:string}
  | {type:'move-capital';cityId:number}
  | {type:'appoint-court';characterId:string;office:import('../../api/src/domain/types').CourtOffice}
  | {type:'dismiss-court';characterId:string}
  | {type:'recruit-character';characterId:string}
  | {type:'recall-army';armyId:string}
  | {type:'form-union';personId:string;partnerId:string;kind:'spouse'|'concubine'}
  | {type:'buy-equipment';templateId:string}
  | {type:'equip-equipment';characterId:string;itemId:string}
  | {type:'unequip-equipment';characterId:string;slot:import('../../api/src/domain/types').EquipmentSlot}
  | {type:'appoint-governor';characterId:string;cityId:number}
  | {type:'dismiss-governor'|'reward-character'|'release-captive'|'recruit-captive';characterId:string}
  | {type:'diplomacy';targetAgentId:string;treaty:Treaty;offer:number;marriage?:import('../../api/src/domain/types').MarriageTerms}
  | {type:'respond-diplomacy';offerId:string;accept:boolean}
  | {type:'hold'}
  | {type:'recruit';cityId:number;amount:number;unitType?:import('../../api/src/domain/types').UnitType}
  | {type:'develop';cityId:number;building?:'farm'|'market'|'barracks'}
  | {type:'move'|'attack';fromCityId:number;toCityId:number;troops:number;commanderId?:string};
export interface PlayerOrder {agentId:string;action:BattleAction}

export interface ArmyState {
  persistent?: boolean;
  name?: string;
  stance?: 'march'|'camp'|'ambush';
  stopProgress?: number;
  blockedReason?: 'terrain';
  units?:Partial<Record<import('../../api/src/domain/types').UnitType,number>>;
  commanderId?:string;
  halted?: boolean;
  id: string;
  owner: string;
  troops: number;
  route: number[];
  leg: number;
  progress: number;
  speed: number;
  remainingTurns?: number;
}

export type Treaty='war'|'peace'|'alliance'|'trade';
export interface DiplomaticRelation {status:'war'|'peace'|'alliance';relation:number;trade:boolean;truceUntil:number}
export interface DiplomaticOffer {id:string;from:string;to:string;treaty:Exclude<Treaty,'war'>;offer:number;expiresTurn:number;marriage?:import('../../api/src/domain/types').MarriageTerms}

export interface LearnedPolicy {
  version: number;
  algorithm: string;
  weights: number[];
  episodes: number;
  trainedAt: string;
  evaluation: { games: number; winRate: number; baselineWinRate: number; meanCounties: number;
    horizon?: number; unresolvedRate?: number;
    bySeat?: { seat: number; games: number; wins: number; unresolved: number;faction?:string;meanCounties?:number;survivalRate?:number }[] };
}

export interface HistoricalMap {
  id: string;
  name: string;
  note: string;
  countyCount: number;
  outline: [number, number][];
  rivers: { name: string; points: [number, number][] }[];
  ranges: { name: string; points: [number, number][] }[];
  regions: { name: string; point: [number, number] }[];
  commanderies: { id: number; name: string; province: string; seatId: number; countyIds: number[]; point: [number, number] }[];
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
  playerAgentId?: string;
  title: string;
  columns: number;
  rows: number;
  agentCount: number;
  maxTurns: number;
}

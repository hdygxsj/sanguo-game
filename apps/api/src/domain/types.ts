export type Terrain = 'plain' | 'farmland' | 'mine' | 'blocked';
export type Weather = 'clear' | 'rain' | 'snow' | 'blizzard' | 'fog';
export type Strategy = 'expansion' | 'defensive' | 'economic' | 'balanced';
export type CourtOffice = 'chancellor' | 'marshal' | 'treasurer';

export interface AgentState {
  startingCityId?: number;
  id: string;
  name: string;
  color: string;
  strategy: Strategy;
  active: boolean;
}

export interface CityState {
  siteKind?: 'city'|'farm'|'mine'|'horse';
  buildings?: Partial<Record<BuildingType,number>>;
  construction?: {building:BuildingType;level:number;completesTurn:number};
  units?: Partial<Record<UnitType,number>>;
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
  /** Hundred-person companies; UI and narrative convert to individual people. */
  troops: number;
  level: number;
  defenseMultiplier: number;
  imperial: boolean;
}

export interface BattleState {
  polities?: Record<string, PolityState>;
  victoryReason?: 'kingdom'|'conquest';
  court?: Record<string,Partial<Record<CourtOffice,string>>>;
  familySettledTurn?: number;
  unions?: FamilyUnion[];
  equipment?: EquipmentItem[];
  characters?: CharacterState[];
  rosterVersion?: number;
  talentRefreshTurn?: number;
  discoveredTalentIds?: string[];
  diplomacy?: Record<string, DiplomaticRelation>;
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

export interface ArmyState {
  persistent?: boolean;
  name?: string;
  stance?: 'march'|'camp'|'ambush';
  stopProgress?: number;
  blockedReason?: 'terrain';
  units?: Partial<Record<UnitType,number>>;
  commanderId?: string;
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

export type Treaty = 'war' | 'peace' | 'alliance' | 'trade';
export interface DiplomaticRelation { status:'war'|'peace'|'alliance'; relation:number; trade:boolean; truceUntil:number }
export interface MarriageTerms {personId:string;partnerId:string}
export interface DiplomaticOffer { id:string;from:string;to:string;treaty:Exclude<Treaty,'war'>;offer:number;expiresTurn:number;marriage?:MarriageTerms }

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

export type BattleAction =
  | {type:'raise-army';cityId:number;commanderId?:string}
  | {type:'order-army';armyId:string;toCityId:number;stopProgress?:number}
  | {type:'army-stance';armyId:string;stance:'camp'|'ambush'}
  | {type:'recruit-army';armyId:string;amount:number;unitType?:UnitType}
  | {type:'found-kingdom';name:string}
  | {type:'move-capital';cityId:number}
  | {type:'appoint-court';characterId:string;office:CourtOffice}
  | {type:'dismiss-court';characterId:string}
  | {type:'recruit-character';characterId:string}
  | {type:'recall-army';armyId:string}
  | {type:'form-union';personId:string;partnerId:string;kind:'spouse'|'concubine'}
  | {type:'buy-equipment';templateId:string}
  | {type:'equip-equipment';characterId:string;itemId:string}
  | {type:'unequip-equipment';characterId:string;slot:EquipmentSlot}
  | {type:'appoint-governor';characterId:string;cityId:number}
  | {type:'dismiss-governor'|'reward-character'|'release-captive'|'recruit-captive';characterId:string}
  | { type:'diplomacy';targetAgentId:string;treaty:Treaty;offer:number;marriage?:MarriageTerms }
  | { type:'respond-diplomacy';offerId:string;accept:boolean }
  | { type: 'hold' }
  | { type: 'recruit'; cityId: number; amount: number; unitType?:UnitType }
  | { type: 'develop'; cityId: number; building?:BuildingType }
  | { type: 'move'; fromCityId: number; toCityId: number; troops: number; commanderId?:string }
  | { type: 'attack'; fromCityId: number; toCityId: number; troops: number; commanderId?:string };

export interface AgentAction {
  agentId: string;
  action: BattleAction;
}

export type EventType =
  | 'kingdom'
  | 'prestige'
  | 'faction-bonus'
  | 'family'
  | 'equipment'
  | 'captive'
  | 'personnel'
  | 'diplomacy'
  | 'trade-income'
  | 'turn-start'
  | 'hold'
  | 'recruit'
  | 'develop'
  | 'move'
  | 'attack'
  | 'capture'
  | 'invalid-action'
  | 'income'
  | 'upkeep'
  | 'desertion'
  | 'march'
  | 'arrival'
  | 'field-battle'
  | 'victory'
  | 'turn-end'
  | 'agent-timeout';

export interface DomainEvent {
  armyId?: string;
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

export interface FamilyUnion {id:string;personId:string;partnerId:string;kind:'spouse'|'concubine';formedTurn:number;pregnancyDueTurn?:number;lastBirthTurn?:number}
export interface CharacterState {
  origin?: 'historical'|'generated';
  archetype?: 'general'|'scholar'|'court';
  portraitSeed?: number;
  recruitedTurn?: number;
  bornTurn?: number;
  ageYears?: number;
  parentIds?: string[];
  capturedBy?: string;
  id:string; name:string; sex:'male'|'female'; owner:string|null; ruler:boolean;
  politics:number; command:number; loyalty:number; governorCityId:number|null;
}
export type EquipmentSlot='weapon'|'mount'|'treasure';
export type UnitType='spear'|'sword'|'archer'|'cavalry';
export type BuildingType='farm'|'market'|'barracks';
export interface EquipmentItem {id:string;templateId:string;owner:string;bearerId?:string}

export interface PolityState {
  prestige:number;
  fallen?:boolean;
  refoundAfterTurn?:number;
  kingdom?:{name:string;capitalId:number;foundedTurn:number;lastMigrationTurn:number};
}

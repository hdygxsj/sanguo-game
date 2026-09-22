import type { AgentState, BattleState, CityState, Strategy, Terrain, Weather } from './types.js';

const AGENT_COLORS = ['#7257ff', '#e05472', '#e7ac4a', '#42b9a8', '#4d89e8', '#a765d1'];
const STRATEGIES: Strategy[] = ['expansion', 'defensive', 'economic', 'balanced'];
const CITY_PREFIXES = ['青', '临', '云', '安', '宁', '武', '河', '广', '永', '昭', '景', '岳'];
const CITY_SUFFIXES = ['州', '城', '关', '郡', '原', '陵', '谷', '港'];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function terrainFor(value: number): Terrain {
  if (value < 0.11) return 'blocked';
  if (value < 0.28) return 'farmland';
  if (value < 0.4) return 'mine';
  return 'plain';
}

function weatherFor(value: number): Weather {
  if (value < 0.55) return 'clear';
  if (value < 0.72) return 'rain';
  if (value < 0.84) return 'fog';
  if (value < 0.95) return 'snow';
  return 'blizzard';
}

function adjacency(id: number, columns: number, rows: number): number[] {
  const x = id % columns;
  const z = Math.floor(id / columns);
  const result: number[] = [];
  if (x > 0) result.push(id - 1);
  if (x < columns - 1) result.push(id + 1);
  if (z > 0) result.push(id - columns);
  if (z < rows - 1) result.push(id + columns);
  return result;
}

export function generateBattle(
  seed: string,
  columns = 7,
  rows = 5,
  agentCount = 4,
  maxTurns = 30,
): BattleState {
  if (columns < 3 || rows < 3) throw new Error('MAP_TOO_SMALL');
  if (agentCount < 2 || agentCount > 6) throw new Error('INVALID_AGENT_COUNT');

  const random = mulberry32(hashSeed(seed));
  const agents: AgentState[] = Array.from({ length: agentCount }, (_, index) => ({
    id: `agent-${index + 1}`,
    name: `Agent ${String.fromCharCode(65 + index)}`,
    color: AGENT_COLORS[index]!,
    strategy: STRATEGIES[index % STRATEGIES.length]!,
    active: true,
  }));

  const cityCount = columns * rows;
  const imperialId = Math.floor(rows / 2) * columns + Math.floor(columns / 2);
  const cities: CityState[] = Array.from({ length: cityCount }, (_, id) => {
    const terrain = id === imperialId ? 'plain' : terrainFor(random());
    const level = id === imperialId ? 4 : 1;
    return {
      id,
      name: `${CITY_PREFIXES[id % CITY_PREFIXES.length]}${CITY_SUFFIXES[Math.floor(id / CITY_PREFIXES.length) % CITY_SUFFIXES.length]}`,
      x: id % columns,
      z: Math.floor(id / columns),
      adjacent: adjacency(id, columns, rows),
      terrain,
      weather: weatherFor(random()),
      resourceTrait: terrain === 'farmland' ? 'granary' : terrain === 'mine' ? 'ore-vein' : null,
      owner: null,
      troops: terrain === 'blocked' ? 0 : 6 + Math.floor(random() * 8),
      level,
      defenseMultiplier: terrain === 'blocked' ? 2 : 1 + level * 0.12,
      imperial: id === imperialId,
    };
  });

  const preferredStarts = [0, columns - 1, cityCount - 1, cityCount - columns, Math.floor(columns / 2), cityCount - Math.ceil(columns / 2)];
  const available = cities.filter((city) => city.terrain !== 'blocked' && !city.imperial);
  const assigned = new Set<number>();

  agents.forEach((agent, index) => {
    const preferred = preferredStarts[index]!;
    const start = [...available]
      .filter((city) => !assigned.has(city.id))
      .sort((left, right) => Math.abs(left.id - preferred) - Math.abs(right.id - preferred))[0];
    if (!start) throw new Error('NO_STARTING_CITY');
    start.owner = agent.id;
    start.troops = 20;
    start.level = 2;
    start.defenseMultiplier = 1.24;
    assigned.add(start.id);
  });

  return {
    seed,
    version: 0,
    turn: 0,
    maxTurns,
    columns,
    rows,
    status: 'active',
    winner: null,
    agents,
    resources: Object.fromEntries(agents.map((agent) => [agent.id, 20])),
    cities,
  };
}

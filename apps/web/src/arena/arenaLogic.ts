import type { CityState } from '../types';

export const ARENA_MODEL_URL = '/models/agent-arena/arena-kit.glb';
export const ARENA_DRACO_DECODER_PATH = '/draco/';
export const TILE_SPACING = 2.4;

export function buildingForCity(city: CityState): string {
  if (city.terrain === 'blocked') return 'mountain';
  if (city.imperial) return 'imperial';
  if (city.level >= 3) return 'stronghold';
  if (city.level === 2) return 'citadel';
  if (city.level === 1 && city.owner) return 'fort';
  return city.id % 2 === 0 ? 'village-a' : 'village-b';
}

export function cityWorldPosition(city: CityState, columns: number, rows: number): [number, number] {
  return [
    Number(((city.x - (columns - 1) / 2) * TILE_SPACING).toFixed(4)),
    Number(((city.z - (rows - 1) / 2) * TILE_SPACING).toFixed(4)),
  ];
}

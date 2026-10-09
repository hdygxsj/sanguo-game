import { describe, expect, it } from 'vitest';
import type { CityState } from '../types';
import {
  ARENA_DRACO_DECODER_PATH,
  ARENA_MODEL_URL,
  buildingForCity,
  cityWorldPosition,
} from './arenaLogic';

const city = (overrides: Partial<CityState> = {}): CityState => ({
  id: 0,
  name: '青州',
  x: 0,
  z: 0,
  adjacent: [],
  terrain: 'plain',
  weather: 'clear',
  resourceTrait: null,
  owner: null,
  troops: 8,
  level: 1,
  defenseMultiplier: 1.12,
  imperial: false,
  ...overrides,
});

describe('arena scene mapping', () => {
  it('keeps resource estates visually distinct from fortified cities after upgrades',()=>{
    for(const siteKind of ['farm','mine','horse'] as const)expect(buildingForCity(city({siteKind,level:4,owner:'agent-1'}))).toBe('village-a');
  });
  it('ships the refined arena kit and Draco decoder from local assets', () => {
    expect(ARENA_MODEL_URL).toBe('/models/agent-arena/arena-kit.glb?v=20261008-masonry');
    expect(ARENA_DRACO_DECODER_PATH).toBe('/draco/');
    expect(ARENA_DRACO_DECODER_PATH).not.toMatch(/^https?:/);
  });

  it('maps strategic state to the expected Blender root', () => {
    expect(buildingForCity(city({ terrain: 'blocked' }))).toBe('mountain');
    expect(buildingForCity(city({ imperial: true, level: 4 }))).toBe('imperial');
    expect(buildingForCity(city({ level: 3 }))).toBe('stronghold');
    expect(buildingForCity(city({ level: 2 }))).toBe('citadel');
    expect(buildingForCity(city({ level: 1, owner: 'agent-1' }))).toBe('fort');
    expect(buildingForCity(city({ level: 1, owner: null }))).toBe('village-a');
  });

  it('centers the generated grid around the world origin', () => {
    expect(cityWorldPosition(city({ x: 0, z: 0 }), 7, 5)).toEqual([-7.2, -4.8]);
    expect(cityWorldPosition(city({ x: 3, z: 2 }), 7, 5)).toEqual([0, 0]);
  });
});

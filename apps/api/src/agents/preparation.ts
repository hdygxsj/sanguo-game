import type {BattleState,CityState} from '../domain/types.js';
import {atWar,factionStrength,mayReassessTreaty} from '../domain/diplomacy.js';

/** Prepare only after a long peace, and only if no active expansion front exists.
 * This is a logistics target, never permission to attack or break a treaty. */
export function preparationTarget(state:BattleState,owner:string):string|undefined {
  if(state.playerAgentId===owner||(state.resources[owner]??0)<40)return;
  const owned=state.cities.filter(c=>c.owner===owner&&c.terrain!=='blocked');
  const neighbours=owned.flatMap(c=>c.adjacent.map(id=>state.cities[id]))
    .filter((c):c is CityState=>c!==undefined&&c.terrain!=='blocked'&&c.owner!==owner);
  if(neighbours.some(c=>!c.owner||atWar(state,owner,c.owner)))return;
  return state.agents.filter(a=>a.active&&a.id!==owner&&neighbours.some(c=>c.owner===a.id))
    .filter(a=>{
      // Preparation builds the strength required for a later declaration.
      // Requiring near-parity here traps wealthy minor factions permanently.
      // Recruitment still checks fiscal runway; diplomacy separately checks
      // military strength, treaty timing and a viable assault before war.
      return mayReassessTreaty(state,owner,a.id);
    })
    .sort((a,b)=>factionStrength(state,a.id)-factionStrength(state,b.id)||a.id.localeCompare(b.id))[0]?.id;
}

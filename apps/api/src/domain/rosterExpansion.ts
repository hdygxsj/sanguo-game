import type {BattleState} from './types.js';
import {expandedHistoricalCharacters} from './historicalRoster.js';
import {refreshTalents} from './talentRefresh.js';
export function expandRoster(state:BattleState):BattleState{
 if(!state.characters)return state;
 if(state.rosterVersion===2){refreshTalents(state);return state;}
 const names=new Set(state.characters.map(p=>p.name)),ids=new Set(state.characters.map(p=>p.id));
 const named=expandedHistoricalCharacters();
 for(const person of named)if(!names.has(person.name)&&!ids.has(person.id)){state.characters.push(person);names.add(person.name);ids.add(person.id);}
 state.rosterVersion=2;
 delete state.talentRefreshTurn;
 refreshTalents(state);return state;
}

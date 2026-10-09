import type {BattleState} from '../types';
import {relationBetween} from '../../../api/src/domain/diplomacy';
export const DIPLOMATIC_COLORS={self:'#839d57',alliance:'#638baf',peace:'#bdac75',war:'#b85d4d'};
export function diplomaticPigment(state:BattleState,playerId:string,factionId:string){return factionId===playerId?DIPLOMATIC_COLORS.self:DIPLOMATIC_COLORS[relationBetween(state,playerId,factionId).status];}

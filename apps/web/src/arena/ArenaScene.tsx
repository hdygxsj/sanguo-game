import { lazy, Suspense } from 'react';
import type { BattleState, DomainEvent } from '../types';
import { HistoricalArena } from './HistoricalArena';
import type {CityCommand} from '../CityActions';

const LegacyArenaScene=lazy(()=>import('./LegacyArenaScene').then(module=>({default:module.LegacyArenaScene})));

export function ArenaScene({state,events,onSelectCity,playerId=null,commandsDisabled=false,onCityAction,onSelectArmy,selectedArmyId,targeting}:{state:BattleState;events:DomainEvent[];onSelectCity?:(id:number|null)=>void;playerId?:string|null;commandsDisabled?:boolean;onCityAction?:(action:CityCommand,id:number)=>void;onSelectArmy?:(id:string)=>void;selectedArmyId?:string|null;targeting?:boolean}) {
  if(state.map)return <HistoricalArena state={state} onSelectCity={onSelectCity} playerId={playerId} commandsDisabled={commandsDisabled} onCityAction={onCityAction} onSelectArmy={onSelectArmy} selectedArmyId={selectedArmyId} targeting={targeting}/>;
  return <Suspense fallback={<div className="webgl-fallback compact">装载历史沙盘…</div>}>
    <LegacyArenaScene state={state} events={events}/>
  </Suspense>;
}

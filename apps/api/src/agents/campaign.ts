import type {BattleState,BattleAction,CityState} from '../domain/types.js';
import {atWar} from '../domain/diplomacy.js';
import {withCommander,commandMultiplier} from '../domain/commanders.js';
import {detachTroops,troopMultiplier,setTroops} from '../domain/troops.js';
import {weatherModifier,roadRoute} from '../domain/marching.js';
import {validateAction} from '../domain/rules.js';
import {preparationTarget} from './preparation.js';

export function flankGarrison(state:BattleState,source:CityState,targetId:number,owner:string):number{
  return Math.max(incomingGarrison(state,source,owner),...source.adjacent.filter(n=>n!==targetId).map(n=>{
    const enemy=state.cities[n];
    if(!enemy?.owner||enemy.owner===owner||enemy.terrain==='blocked'||!atWar(state,owner,enemy.owner))return 0;
    return Math.floor(enemy.troops*weatherModifier(source.weather)*troopMultiplier(enemy,source,true)
      /(source.defenseMultiplier*troopMultiplier(source,enemy)))+1;
  }));
}

function incomingGarrison(state:BattleState,city:CityState,owner:string):number{
  return Math.max(0,...(state.armies??[]).filter(a=>a.troops>0&&!a.halted&&a.owner!==owner
    &&a.route.at(-1)===city.id&&atWar(state,owner,a.owner)).map(a=>
    Math.floor(a.troops*weatherModifier(city.weather)*commandMultiplier(state,a)*troopMultiplier(a,city,true)
      /(city.defenseMultiplier*troopMultiplier(city,a))+1e-9)+1));
}

export function campaignActions(state:BattleState,owner:string):BattleAction[]{
  const recalls:BattleAction[]=(state.armies??[]).filter(a=>a.owner===owner&&a.halted)
    .map(a=>({type:'recall-army',armyId:a.id}));
  const owned=state.cities.filter(c=>c.owner===owner&&c.terrain!=='blocked');
  const hostile=(id:number)=>{const c=state.cities[id];return c&&c.terrain!=='blocked'&&c.owner!==owner&&(!c.owner||atWar(state,owner,c.owner));};
  const preparation=preparationTarget(state,owner);
  const frontier=(id:number)=>hostile(id)||(preparation!==undefined&&state.cities[id]?.owner===preparation&&state.cities[id]?.terrain!=='blocked');
  const inbound=new Set((state.armies??[]).filter(a=>a.owner===owner&&a.troops>0&&!a.halted).map(a=>a.route[a.route.length-1]!));
  const distance=new Map<number,number>(),destination=new Map<number,number>(),queue:number[]=[];
  for(const c of owned)if(c.adjacent.some(frontier)){distance.set(c.id,0);destination.set(c.id,c.id);queue.push(c.id);}
  for(let i=0;i<queue.length;i++){
    const id=queue[i]!;
    for(const next of state.cities[id]!.adjacent){
      const c=state.cities[next];
      if(c?.owner===owner&&c.terrain!=='blocked'&&!distance.has(next)){distance.set(next,distance.get(id)!+1);destination.set(next,destination.get(id)!);queue.push(next);}
    }
  }
  const attacks:{action:BattleAction;score:number}[]=[],moves:{action:BattleAction;score:number}[]=[];
  for(const source of owned){
    const depth=distance.get(source.id);if(depth===undefined)continue;
    if(depth===0){
      for(const id of source.adjacent){
        if(!hostile(id)||inbound.has(id))continue;
        // Taking a weak neighbour must not expose the departure city to another
        // front. Estimate that front's full garrison, including unit counters.
        const flankReserve=flankGarrison(state,source,id,owner);
        const troops=source.troops-Math.max(2,Math.ceil(source.troops*.15),flankReserve);
        if(troops<2)continue;
        const target=state.cities[id]!;
        const action=withCommander(state,owner,{type:'attack',fromCityId:source.id,toCityId:id,troops});
        if(action.type!=='attack')continue;
        const copy={troops:source.troops,units:source.units};
        const army={id:'estimate',owner,troops,units:detachTroops(copy,troops),route:[source.id,id],leg:0,progress:0,speed:.7,commanderId:action.commanderId};
        const power=troops*weatherModifier(target.weather)*commandMultiplier(state,army)*troopMultiplier(army,target,true);
        const defense=target.troops*target.defenseMultiplier*troopMultiplier(target,army);
        if(power>defense*1.15){
          const survivors=Math.max(1,Math.round((power-defense)/(power/troops)));
          const occupation={...target,owner,troops:army.troops,units:army.units};
          setTroops(occupation,survivors);
          // The next turn starts with these survivors, not the original army.
          // Ignore stationary neutral garrisons just as for the home reserve.
          if(survivors>=flankGarrison(state,occupation,source.id,owner))attacks.push({action,score:power-defense});
        }
      }
    }else{
      const troops=source.troops-Math.max(2,incomingGarrison(state,source,owner));if(troops<3)continue;
      const front=destination.get(source.id)!;
      if(inbound.has(front))continue;
      const next=source.adjacent.filter(id=>distance.get(id)===depth-1&&!inbound.has(id)).sort((a,b)=>state.cities[a]!.troops-state.cities[b]!.troops)[0];
      if(next!==undefined){
        // Reuse the real road planner, but never send a reinforcement through
        // enemy/neutral counties merely because that route is shorter.
        const route=roadRoute(state,source.id,front,owner);
        const target=route?.every(id=>state.cities[id]!.owner===owner)?front:next;
        moves.push({action:withCommander(state,owner,{type:'move',fromCityId:source.id,toCityId:target,troops}),score:troops/depth});
      }
    }
  }
  // A frontier-only component used to stall forever: no rear reserves and no
  // single garrison strong enough to attack. Rally along friendly edges toward
  // the best prepared front, accounting for troops already committed there.
  {
    const incoming=new Map<number,number>();
    for(const army of state.armies??[])if(army.owner===owner&&!army.halted){
      const destination=army.route.at(-1)!;
      incoming.set(destination,(incoming.get(destination)??0)+army.troops);
    }
    const seen=new Set<number>();
    for(const start of owned){
      if(seen.has(start.id))continue;
      const component=[start.id];seen.add(start.id);
      for(let i=0;i<component.length;i++)for(const next of state.cities[component[i]!]!.adjacent){
        if(state.cities[next]?.owner===owner&&state.cities[next]!.terrain!=='blocked'&&!seen.has(next)){
          seen.add(next);component.push(next);
        }
      }
      // An attack in another disconnected theatre must not suppress this
      // component's preparations. Do not dismantle a locally ready assault.
      if(attacks.some(({action})=>action.type==='attack'&&component.includes(action.fromCityId)))continue;
      const fronts=component.filter(id=>distance.get(id)===0);
      const readiness=(id:number)=>{
        const city=state.cities[id]!;
        const weakest=Math.min(...city.adjacent.filter(frontier).map(n=>state.cities[n]!.troops*state.cities[n]!.defenseMultiplier));
        return (city.troops+(incoming.get(id)??0))/Math.max(1,weakest);
      };
      fronts.sort((a,b)=>readiness(b)-readiness(a)||a-b);
      const focus=fronts[0];if(focus===undefined||fronts.length<2)continue;
      const steps=new Map([[focus,0]]),route=[focus];
      for(let i=0;i<route.length;i++)for(const next of state.cities[route[i]!]!.adjacent){
        if(state.cities[next]?.owner===owner&&state.cities[next]!.terrain!=='blocked'&&!steps.has(next)){
          steps.set(next,steps.get(route[i]!)!+1);route.push(next);
        }
      }
      for(const id of fronts.slice(1)){
        const source=state.cities[id]!,depth=steps.get(id)!;
        const threat=Math.max(0,...source.adjacent.filter(frontier).map(n=>state.cities[n]!.troops));
        const reserve=Math.max(2,Math.ceil(threat*.4),incomingGarrison(state,source,owner));
        const troops=source.troops-reserve;if(troops<3)continue;
        const next=source.adjacent.find(n=>steps.get(n)===depth-1&&!inbound.has(n));
        if(next===undefined)continue;
        // Keep the rally destination across rear counties: unloading on the
        // first leg lets the nearest-front planner send reserves back home.
        // The real marching system still traverses every road over time.
        const rallyRoute=roadRoute(state,id,focus,owner);
        const target=rallyRoute?.every(n=>state.cities[n]!.owner===owner)?focus:next;
        if(inbound.has(target))continue;
        moves.push({action:withCommander(state,owner,{type:'move',fromCityId:id,toCityId:target,troops}),score:troops/(depth+.5)});
      }
    }
  }
  return [...recalls,...[...attacks.sort((a,b)=>b.score-a.score),...moves.sort((a,b)=>b.score-a.score)].map(x=>x.action)].filter(a=>validateAction(state,owner,a).ok);
}

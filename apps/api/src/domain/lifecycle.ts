import type {BattleState,CharacterState,DomainEvent} from './types.js';
export const isMinor=(p:CharacterState)=>p.ageYears!==undefined&&p.ageYears<18;
export function related(s:BattleState,a:CharacterState,b:CharacterState){
  const ancestors=(p:CharacterState)=>{const seen=new Set<string>(),queue=[...(p.parentIds??[])];while(queue.length){const id=queue.pop()!;if(seen.has(id))continue;seen.add(id);queue.push(...(s.characters?.find(c=>c.id===id)?.parentIds??[]));}return seen;};
  const aa=ancestors(a),bb=ancestors(b);return aa.has(b.id)||bb.has(a.id)||[...aa].some(id=>bb.has(id));
}
function roll(text:string){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)/4294967296;}
export function settleFamily(s:BattleState,emit:(e:Omit<DomainEvent,'turn'|'sequence'>)=>void){
  if(!s.characters||s.familySettledTurn===s.turn)return;
  s.familySettledTurn=s.turn;
  for(const p of s.characters)if(p.ageYears!==undefined&&s.turn>(p.bornTurn??0)&&(s.turn-(p.bornTurn??0))%4===0){
    p.ageYears++;
    if(p.ageYears===18)emit({type:'family',agentId:p.owner??undefined,message:`${p.name} 成年，可以任职与领军`});
  }
  for(const u of s.unions??[]){
    const p=s.characters.find(p=>p.id===u.personId),q=s.characters.find(p=>p.id===u.partnerId);if(!p||!q)continue;
    const mother=p.sex==='female'?p:q,father=p.sex==='male'?p:q;
    if(u.pregnancyDueTurn!==undefined&&s.turn>=u.pregnancyDueTurn){
      const id=`child-${u.id}-${u.pregnancyDueTurn}`;
      if(!s.characters.some(c=>c.id===id)){
        const sex=roll(`${s.seed}:${id}:sex`)<.5?'female':'male';
        const number=s.characters.filter(c=>c.parentIds?.includes(mother.id)).length+1;
        const child:CharacterState={id,name:`${father.name[0]}${sex==='female'?'宁':'安'}${number}`,sex,owner:mother.owner,ruler:false,ageYears:0,bornTurn:s.turn,parentIds:[father.id,mother.id],politics:Math.round((p.politics+q.politics)/2),command:Math.round((p.command+q.command)/2),loyalty:75,governorCityId:null};
        s.characters.push(child);emit({type:'family',agentId:child.owner??undefined,message:`${mother.name} 诞下${sex==='female'?'女儿':'儿子'} ${child.name}，父亲 ${father.name}`});
      }
      delete u.pregnancyDueTurn;u.lastBirthTurn=s.turn;continue;
    }
    if(u.pregnancyDueTurn!==undefined||s.turn%4!==0||s.turn<=u.formedTurn||s.turn-(u.lastBirthTurn??-8)<8)continue;
    if(!mother.owner||mother.owner!==father.owner||!s.agents.some(a=>a.id===mother.owner&&a.active)||(mother.ageYears??0)<18||(mother.ageYears??100)>=45||(father.ageYears??0)<18||mother.capturedBy||father.capturedBy||s.armies?.some(a=>a.commanderId===mother.id||a.commanderId===father.id)||mother.loyalty<50||father.loyalty<50||(s.resources[mother.owner]??0)<20)continue;
    if(roll(`${s.seed}:${u.id}:${s.turn}:birth`)>=.25)continue;
    s.resources[mother.owner]!-=20;u.pregnancyDueTurn=s.turn+3;
    emit({type:'family',agentId:mother.owner,message:`${mother.name} 有孕，预计第 ${u.pregnancyDueTurn} 回合添丁，家用支出 20`});
  }
}

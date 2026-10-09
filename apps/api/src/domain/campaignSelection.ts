import {HAN_REGISTER} from './hanRegister.js';

// Gameplay priorities, not a claim about the county register for one exact year.
const IMPORTANT=new Set(['長安縣','許縣','鄴縣','襄陽縣','江陵縣','成都縣','建業縣','秣陵縣','下邳縣','小沛縣','沛縣','壽春縣','宛縣','漢中縣','南鄭縣','武陵縣','濮陽縣','官渡縣','陳倉縣','合肥國']);
export const resourceCounty=(names:string[])=>[...names].reverse().find(n=>n!==names[0]&&!IMPORTANT.has(n));
export function campaignSelection(){
  const groups=HAN_REGISTER.map(r=>[r.seat]);
  let count=groups.length;
  HAN_REGISTER.forEach((record,i)=>{for(const name of record.counties)if(name!==record.seat&&IMPORTANT.has(name)){groups[i]!.push(name);count++;}});
  // One extra per commandery per pass, favouring the least represented areas.
  while(count<300){
    let added=false;
    const order=groups.map((g,i)=>({i,n:g.length})).sort((a,b)=>a.n-b.n||a.i-b.i);
    for(const {i} of order){
      const name=HAN_REGISTER[i]!.counties.find(n=>!groups[i]!.includes(n));
      if(name){groups[i]!.push(name);count++;added=true;if(count===300)break;}
    }
    if(!added)break;
  }
  return groups;
}

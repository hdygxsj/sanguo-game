import type { InstancedMesh } from 'three';
export function fadeCounty(current:number,wanted:boolean,dt:number){return (wanted?1:0)+(current-(wanted?1:0))*Math.exp(-9*Math.max(0,dt));}
export function refreshInstanceBounds(mesh:InstancedMesh){mesh.instanceMatrix.needsUpdate=true;mesh.boundingSphere=null;}
export function retainLodSlots<T extends {id:number}>(current:T[],wanted:T[],alpha:Map<number,number>,capacity:number){
  const desired=new Map(wanted.map(c=>[c.id,c]));
  const retained=current.filter(c=>(alpha.get(c.id)??0)>.005).map(c=>desired.get(c.id)??c);
  const ids=new Set(retained.map(c=>c.id));
  const next=[...retained,...wanted.filter(c=>!ids.has(c.id)).slice(0,Math.max(0,capacity-retained.length))];
  const kept=new Set(next.map(c=>c.id));for(const id of alpha.keys())if(!kept.has(id))alpha.delete(id);
  return next;
}

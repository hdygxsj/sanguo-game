export function garrisonUnitSlots(troops:number,units:Partial<Record<'spear'|'sword'|'archer'|'cavalry',number>>|undefined,slots:number):string[]{
  const count=Math.max(0,Math.min(slots,Math.ceil(troops/10)));
  const sword=Math.max(0,units?.sword??0),archer=Math.max(0,units?.archer??0);
  const cavalry=Math.max(0,units?.cavalry??0);
  const spear=Math.max(0,troops-sword-archer-cavalry),total=spear+sword+archer+cavalry;
  return Array.from({length:count},(_,i)=>{
    const sample=(i+.5)/count*total;
    return sample<sword?'sword':sample<sword+archer?'archer':sample<sword+archer+cavalry?'cavalry':'spear';
  });
}
export function archerSlots(troops:number,archers:number,slots:number):boolean[]{
  const count=Math.max(0,Math.min(slots,Math.ceil(troops/10)));
  const ratio=troops>0?Math.max(0,Math.min(1,archers/troops)):0;
  return Array.from({length:count},(_,i)=>Math.round((i+1)*ratio)>Math.round(i*ratio));
}

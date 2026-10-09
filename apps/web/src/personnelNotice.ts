export function personnelNotice(events:{type:string;agentId?:string;turn:number;message:string}[],owner:string|null,turn:number):string|undefined{
  const current=events.filter(e=>e.agentId===owner&&e.turn===turn).reverse();
  return (current.find(e=>['family','equipment','captive'].includes(e.type))??current.find(e=>e.type==='personnel'))?.message;
}

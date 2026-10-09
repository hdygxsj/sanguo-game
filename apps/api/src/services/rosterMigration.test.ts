import {expect,it,vi} from 'vitest';
import type {PrismaClient} from '@prisma/client';
import {BattleService} from './battleService.js';
import {generateBattle} from '../domain/generate.js';
it('exposes additions in active saves but never rewrites replay or ended campaigns',async()=>{
 const old=generateBattle('old-save',7,5,16);
 old.characters=old.characters!.filter(p=>p.id.startsWith('person-')||p.id.startsWith('talent-'));delete old.rosterVersion;
 const stateJson=JSON.stringify(old),record={id:'battle',turns:[{stateJson}]};
 const prisma={battle:{findFirst:vi.fn(async()=>record)},turn:{findUnique:vi.fn(async()=>({stateJson}))},event:{findMany:vi.fn(async()=>[])}};
 const service=new BattleService(prisma as unknown as PrismaClient);
 const current=await service.get('owner','battle');expect(current.state.characters!.length).toBeGreaterThan(400);
 expect((await service.replay('owner','battle',0)).snapshot.characters).toHaveLength(64);
 expect(record.turns[0]!.stateJson).toBe(stateJson);
 record.turns[0]!.stateJson=JSON.stringify({...old,status:'completed'});
 expect((await service.get('owner','battle')).state.characters).toHaveLength(64);
});

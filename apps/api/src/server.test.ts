import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './db.js';
import { buildServer } from './server.js';

const app = buildServer();

beforeEach(async () => {
  await prisma.event.deleteMany();
  await prisma.turn.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.battle.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.event.deleteMany();
  await prisma.turn.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.battle.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await app.close();
  await prisma.$disconnect();
});

describe('Agent Arena API', () => {
  it('persists independent army recruitment and rejects foreign orders without changing replay',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'}),cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'独立兵团验收',columns:7,rows:5,agentCount:2,playerAgentId:'agent-1'}});
    const id=created.json().battle.id,url=`/api/battles/${id}`,initial=(await app.inject({method:'GET',url,cookies})).json().battle.state;
    const home=initial.cities.find((c:{owner:string;troops:number;siteKind?:string})=>c.owner==='agent-1'&&c.troops>=7&&c.siteKind==='city');
    const raised=await app.inject({method:'POST',url:`${url}/turns`,cookies,payload:{expectedVersion:0,order:{agentId:'agent-1',action:{type:'raise-army',cityId:home.id}}}});
    expect(raised.statusCode).toBe(200);const army=raised.json().state.armies.find((a:{owner:string})=>a.owner==='agent-1');expect(army).toMatchObject({troops:6,persistent:true,stance:'camp'});
    const recruited=await app.inject({method:'POST',url:`${url}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:'agent-1',action:{type:'recruit-army',armyId:army.id,amount:1,unitType:'archer'}}}});
    expect(recruited.statusCode).toBe(200);expect(recruited.json().state.armies.find((a:{id:string})=>a.id===army.id).units.archer).toBe(1);
    const foreign=await app.inject({method:'POST',url:`${url}/turns`,cookies,payload:{expectedVersion:2,order:{agentId:'agent-2',action:{type:'army-stance',armyId:army.id,stance:'camp'}}}});expect(foreign.statusCode).toBe(400);
    const replay=(await app.inject({method:'GET',url:`${url}/replay?turn=1`,cookies})).json().snapshot;expect(replay.armies.find((a:{id:string})=>a.id===army.id).troops).toBe(6);
    const saved=(await app.inject({method:'GET',url,cookies})).json().battle.state;expect(saved.armies.find((a:{id:string})=>a.id===army.id).troops).toBe(7);
  });
  it('persists kingdom founding, migration and prestige without rewriting replay',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'}),cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'立国验收',columns:7,rows:5,agentCount:2,playerAgentId:'agent-1'}});
    const id=created.json().battle.id,url=`/api/battles/${id}`,initial=(await app.inject({method:'GET',url,cookies})).json().battle.state;
    initial.polities={'agent-1':{prestige:300}};initial.resources['agent-1']=1000;
    initial.cities.filter((c:{owner:string;terrain:string})=>!c.owner&&c.terrain!=='blocked').slice(0,4).forEach((c:{owner:string})=>c.owner='agent-1');
    await prisma.turn.update({where:{battleId_number:{battleId:id,number:0}},data:{stateJson:JSON.stringify(initial)}});
    const order={agentId:'agent-1',action:{type:'found-kingdom',name:'魏'}};
    const founded=await app.inject({method:'POST',url:`${url}/turns`,cookies,payload:{expectedVersion:0,order}});
    expect(founded.statusCode).toBe(200);expect(founded.json().state.polities['agent-1'].kingdom).toMatchObject({name:'魏',capitalId:initial.agents[0].startingCityId,foundedTurn:1});
    const duplicate=await app.inject({method:'POST',url:`${url}/turns`,cookies,payload:{expectedVersion:1,order}});expect(duplicate.statusCode).toBe(400);
    const saved=founded.json().state;const target=saved.cities.find((c:{owner:string;siteKind?:string;id:number})=>c.owner==='agent-1'&&(!c.siteKind||c.siteKind==='city')&&c.id!==initial.agents[0].startingCityId);
    saved.polities['agent-1'].kingdom.lastMigrationTurn=-8;
    await prisma.turn.update({where:{battleId_number:{battleId:id,number:1}},data:{stateJson:JSON.stringify(saved)}});
    const moved=await app.inject({method:'POST',url:`${url}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:'agent-1',action:{type:'move-capital',cityId:target.id}}}});
    expect(moved.statusCode).toBe(200);expect(moved.json().state.polities['agent-1'].kingdom).toMatchObject({capitalId:target.id,foundedTurn:1});
    const before=(await app.inject({method:'GET',url:`${url}/replay?turn=0`,cookies})).json().snapshot;
    expect(before.polities['agent-1'].kingdom).toBeUndefined();expect(before.polities['agent-1'].prestige).toBe(300);
    const after=(await app.inject({method:'GET',url,cookies})).json().battle.state;expect(after.polities['agent-1'].kingdom.capitalId).toBe(target.id);
  });
  it('persists the chosen ruler at creation and rejects a ruler outside the scenario',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    const payload={title:'君主开局验证',columns:7,rows:5,agentCount:2,maxTurns:0,playerAgentId:'agent-2'};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload});
    expect(created.statusCode).toBe(201);
    const response=await app.inject({method:'GET',url:`/api/battles/${created.json().battle.id}`,cookies});
    expect(response.json().battle.state.playerAgentId).toBe('agent-2');
    expect(response.json().battle.state.turn).toBe(0);
    const invalid=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{...payload,playerAgentId:'agent-16'}});
    expect(invalid.statusCode).toBe(400);
  });
  it('returns one parsed snapshot without duplicating raw turn JSON in battle detail',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'加载体积验证',columns:7,rows:5,agentCount:2,maxTurns:0}});
    const response=await app.inject({method:'GET',url:`/api/battles/${created.json().battle.id}`,cookies});
    expect(response.statusCode).toBe(200);
    expect(response.json().battle.state.cities).toHaveLength(300);
    expect(response.json().battle).not.toHaveProperty('turns');
  });
  it('persists court appointments and dismissal without changing historical replay',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'官位验证',columns:7,rows:5,agentCount:2,maxTurns:0}});
    const id=created.json().battle.id;
    const initial=(await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.state;
    const owner=initial.agents[0].id;
    initial.resources[owner]=300;
    await prisma.turn.update({where:{battleId_number:{battleId:id,number:0}},data:{stateJson:JSON.stringify(initial)}});
    const action={type:'appoint-court',characterId:'person-1-1',office:'chancellor'};
    const appointed=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:0,order:{agentId:owner,action}}});
    expect(appointed.statusCode).toBe(200);
    expect(appointed.json().state.court[owner].chancellor).toBe(action.characterId);
    expect(appointed.json().events.some((e:{type:string;amount:number})=>e.type==='personnel'&&e.amount===80)).toBe(true);
    const duplicate=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:owner,action}}});
    expect(duplicate.statusCode).toBe(400);
    expect((await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.version).toBe(1);
    const dismissed=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:owner,action:{type:'dismiss-court',characterId:action.characterId}}}});
    expect(dismissed.statusCode).toBe(200);
    expect(dismissed.json().state.court[owner].chancellor).toBeUndefined();
    const replay=(await app.inject({method:'GET',url:`/api/battles/${id}/replay?turn=1`,cookies})).json();
    expect(replay.snapshot.court[owner].chancellor).toBe(action.characterId);
  });
  it('recruits neutral talent through HTTP and persists ownership and salary-bearing staff in replay',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'招贤验证',columns:7,rows:5,agentCount:2,maxTurns:0}});
    const id=created.json().battle.id;
    const initial=(await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.state;
    const owner=initial.agents[0].id,person=initial.characters.find((p:{name:string})=>p.name==='诸葛亮');
    initial.resources[owner]=200;
    await prisma.turn.update({where:{battleId_number:{battleId:id,number:0}},data:{stateJson:JSON.stringify(initial)}});
    const action={type:'recruit-character',characterId:person.id};
    const response=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:0,order:{agentId:owner,action}}});
    expect(response.statusCode).toBe(200);
    expect(response.json().events.some((e:{type:string;amount:number})=>e.type==='personnel'&&e.amount===89)).toBe(true);
    const replay=(await app.inject({method:'GET',url:`/api/battles/${id}/replay?turn=1`,cookies})).json();
    expect(replay.snapshot.characters.find((p:{id:string})=>p.id===person.id)).toMatchObject({owner,loyalty:55});
    const duplicate=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:owner,action}}});
    expect(duplicate.statusCode).toBe(400);
    expect((await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.version).toBe(1);
  });
  it('accepts army recall through HTTP and preserves its route in replay',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'撤军验证',columns:7,rows:5,agentCount:2,maxTurns:0}});
    const id=created.json().battle.id;
    const initial=(await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.state;
    const owner=initial.agents[0].id,home=initial.cities.find((c:{owner:string})=>c.owner===owner);
    const border=initial.cities[home.adjacent[0]];
    // Keep the real terrain coordinates; slow this fixture to observe transit.
    initial.armies=[{id:'recall-fixture',owner,troops:12,units:{spear:12},route:[home.id,border.id],leg:0,progress:1,speed:.001,halted:true}];
    await prisma.turn.update({where:{battleId_number:{battleId:id,number:0}},data:{stateJson:JSON.stringify(initial)}});
    const response=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:0,order:{agentId:owner,action:{type:'recall-army',armyId:'recall-fixture'}}}});
    expect(response.statusCode).toBe(200);
    const army=response.json().state.armies.find((a:{id:string})=>a.id==='recall-fixture');
    expect(army).toMatchObject({route:[border.id,home.id],halted:false,troops:12});
    expect(army.progress).toBeGreaterThan(0);expect(army.progress).toBeLessThan(1);
    const replay=(await app.inject({method:'GET',url:`/api/battles/${id}/replay?turn=1`,cookies})).json();
    expect(replay.snapshot.armies.find((a:{id:string})=>a.id==='recall-fixture')).toEqual(army);
    const invalid=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:owner,action:{type:'recall-army',armyId:'missing'}}}});
    expect(invalid.statusCode).toBe(400);
    expect((await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.version).toBe(1);
  });
  it('persists construction progress and completed buildings in replay',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'城建验证',columns:7,rows:5,agentCount:2,maxTurns:0}});
    const id=created.json().battle.id;
    const initial=(await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.state;
    const owner=initial.agents[0].id,city=initial.cities.find((c:{owner:string})=>c.owner===owner);
    const first=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:0,order:{agentId:owner,action:{type:'develop',cityId:city.id,building:'farm'}}}});
    expect(first.statusCode).toBe(200);
    expect(first.json().state.cities[city.id].construction).toMatchObject({building:'farm',completesTurn:2});
    const busy=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:owner,action:{type:'develop',cityId:city.id,building:'market'}}}});
    expect(busy.statusCode).toBe(400);
    const next=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:owner,action:{type:'hold'}}}});
    expect(next.statusCode).toBe(200);expect(next.json().state.cities[city.id].buildings.farm).toBe(1);
    const replay=(await app.inject({method:'GET',url:`/api/battles/${id}/replay?turn=1`,cookies})).json();
    expect(replay.snapshot.cities[city.id].construction).toBeDefined();
    expect(replay.snapshot.cities[city.id].buildings).toBeUndefined();
  });
  it('binds ruler orders, persists them in replay and rejects invalid commands without advancing',async()=>{
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    const created=await app.inject({method:'POST',url:'/api/battles',cookies,payload:{title:'君主指令验证',columns:7,rows:5,agentCount:16,maxTurns:0}});
    expect(created.statusCode).toBe(201);
    const id=created.json().battle.id;
    const initial=(await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.state;
    const owner=initial.agents[0].id;
    const city=initial.cities.find((c:{owner:string})=>c.owner===owner);
    const response=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:0,order:{agentId:owner,action:{type:'recruit',cityId:city.id,amount:2}}}});
    expect(response.statusCode).toBe(200);
    expect(response.json().state.playerAgentId).toBe(owner);
    expect(response.json().events.some((e:{agentId:string;type:string;amount:number})=>e.agentId===owner&&e.type==='recruit'&&e.amount===2)).toBe(true);
    const replay=await app.inject({method:'GET',url:`/api/battles/${id}/replay?turn=1`,cookies});
    expect(replay.json().snapshot.playerAgentId).toBe(owner);
    const wrong=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:initial.agents[1].id,action:{type:'hold'}}}});
    expect(wrong.statusCode).toBe(400);
    const invalid=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1,order:{agentId:owner,action:{type:'recruit',cityId:city.id,amount:999999}}}});
    expect(invalid.statusCode).toBe(400);
    expect((await app.inject({method:'GET',url:`/api/battles/${id}`,cookies})).json().battle.version).toBe(1);
    const held=await app.inject({method:'POST',url:`/api/battles/${id}/turns`,cookies,payload:{expectedVersion:1}});
    expect(held.json().events.some((e:{type:string;agentId:string})=>e.type==='hold'&&e.agentId===owner)).toBe(true);
  });
  it('logs in with the development code and returns the current user', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { phone: '13800138000', code: '246810' },
    });

    expect(login.statusCode).toBe(200);
    const cookie = login.cookies[0]?.value;
    expect(cookie).toBeTruthy();

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { arena_session: cookie! },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.phone).toBe('13800138000');
  });

  it('creates, lists, advances, and replays a battle', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login' });
    const cookies = { arena_session: login.cookies[0]!.value };

    const created = await app.inject({
      method: 'POST',
      url: '/api/battles',
      cookies,
      payload: { title: '群雄逐鹿', columns: 7, rows: 5, agentCount: 4, maxTurns: 20 },
    });
    expect(created.statusCode).toBe(201);
    const battleId = created.json().battle.id;
    expect(created.json().battle.maxTurns).toBe(0);

    const listed = await app.inject({ method: 'GET', url: '/api/battles', cookies });
    expect(listed.json().battles).toHaveLength(1);

    const advanced = await app.inject({
      method: 'POST',
      url: `/api/battles/${battleId}/turns`,
      cookies,
      payload: { expectedVersion: 0 },
    });
    expect(advanced.statusCode).toBe(200);
    expect(advanced.json().state.turn).toBe(1);
    expect(advanced.json().state.cities).toHaveLength(300);
    expect(advanced.json().state.policy.episodes).toBeGreaterThan(0);

    const replay = await app.inject({
      method: 'GET',
      url: `/api/battles/${battleId}/replay?turn=1`,
      cookies,
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().snapshot.turn).toBe(1);
    expect(replay.json().events.length).toBeGreaterThan(0);
    expect(replay.json().snapshot.policy).toEqual(advanced.json().state.policy);
  });

  it('requires authentication and validates training budgets', async () => {
    expect((await app.inject({method:'GET',url:'/api/training'})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:'/api/training',payload:{episodes:100}})).statusCode).toBe(401);
    const login=await app.inject({method:'POST',url:'/api/auth/demo-login'});
    const cookies={arena_session:login.cookies[0]!.value};
    expect((await app.inject({method:'POST',url:'/api/training',cookies,payload:{episodes:100000}})).statusCode).toBe(400);
    const status=await app.inject({method:'GET',url:'/api/training',cookies});
    expect(status.statusCode).toBe(200);
    expect(status.json().policy.weights.every(Number.isFinite)).toBe(true);
  });

  it('rejects stale turn execution with a conflict', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login' });
    const cookies = { arena_session: login.cookies[0]!.value };
    const created = await app.inject({
      method: 'POST',
      url: '/api/battles',
      cookies,
      payload: { title: '版本冲突', columns: 5, rows: 4, agentCount: 2, maxTurns: 10 },
    });
    const battleId = created.json().battle.id;
    await app.inject({ method: 'POST', url: `/api/battles/${battleId}/turns`, cookies, payload: { expectedVersion: 0 } });

    const stale = await app.inject({
      method: 'POST',
      url: `/api/battles/${battleId}/turns`,
      cookies,
      payload: { expectedVersion: 0 },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('VERSION_CONFLICT');
  });
});

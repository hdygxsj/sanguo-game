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
  await app.close();
  await prisma.$disconnect();
});

describe('Agent Arena API', () => {
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

    const replay = await app.inject({
      method: 'GET',
      url: `/api/battles/${battleId}/replay?turn=1`,
      cookies,
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().snapshot.turn).toBe(1);
    expect(replay.json().events.length).toBeGreaterThan(0);
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

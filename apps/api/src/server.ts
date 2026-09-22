import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getUserForToken, loginWithCode } from './auth/service.js';
import { prisma } from './db.js';
import { registerRealtimeGateway } from './realtime/gateway.js';
import { BattleService } from './services/battleService.js';

const loginSchema = z.object({ phone: z.string(), code: z.string() });
const createBattleSchema = z.object({
  title: z.string().trim().min(2).max(40),
  columns: z.number().int().min(5).max(11),
  rows: z.number().int().min(4).max(8),
  agentCount: z.number().int().min(2).max(6),
  maxTurns: z.number().int().min(5).max(100),
});
const turnSchema = z.object({ expectedVersion: z.number().int().min(0) });

async function authenticatedUser(request: FastifyRequest, reply: FastifyReply) {
  const user = await getUserForToken(prisma, request.cookies.arena_session);
  if (!user) {
    await reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: '请先登录' } });
    return null;
  }
  return user;
}

function setSession(reply: FastifyReply, token: string) {
  reply.setCookie('arena_session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function buildServer() {
  const app = Fastify({ logger: false });
  const battles = new BattleService(prisma);

  void app.register(cookie);
  void app.register(cors, { origin: true, credentials: true });
  void registerRealtimeGateway(app);

  app.setErrorHandler((error, _request, reply) => {
    const code = error instanceof z.ZodError ? 'VALIDATION_ERROR' : error.message;
    const status = code === 'VERSION_CONFLICT' ? 409 : code.endsWith('_NOT_FOUND') ? 404 : code.startsWith('INVALID_') || code === 'VALIDATION_ERROR' ? 400 : 500;
    void reply.code(status).send({ error: { code, message: code === 'VALIDATION_ERROR' ? '请求参数不合法' : error.message } });
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'agent-arena-api' }));
  app.post('/api/auth/request-code', async (request, reply) => {
    const body = z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/) }).parse(request.body);
    return reply.send({ sent: true, developmentCode: '246810', phone: body.phone });
  });
  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const { user, session } = await loginWithCode(prisma, body.phone, body.code);
    setSession(reply, session.token);
    return { user };
  });
  app.post('/api/auth/demo-login', async (_request, reply) => {
    const { user, session } = await loginWithCode(prisma, '13800138000', '246810');
    setSession(reply, session.token);
    return { user };
  });
  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies.arena_session;
    if (token) await prisma.session.deleteMany({ where: { token } });
    reply.clearCookie('arena_session', { path: '/' });
    return { ok: true };
  });
  app.get('/api/auth/me', async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    return { user };
  });

  app.get('/api/battles', async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    return { battles: await battles.list(user.id) };
  });
  app.post('/api/battles', async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    const input = createBattleSchema.parse(request.body);
    const battle = await battles.create(user.id, input);
    return reply.code(201).send({ battle });
  });
  app.get<{ Params: { id: string } }>('/api/battles/:id', async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    return { battle: await battles.get(user.id, request.params.id) };
  });
  app.post<{ Params: { id: string } }>('/api/battles/:id/turns', async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    const { expectedVersion } = turnSchema.parse(request.body);
    return battles.executeTurn(user.id, request.params.id, expectedVersion);
  });
  app.get<{ Params: { id: string }; Querystring: { turn?: string } }>('/api/battles/:id/replay', async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    const turn = z.coerce.number().int().min(0).parse(request.query.turn ?? '0');
    return battles.replay(user.id, request.params.id, turn);
  });

  return app;
}

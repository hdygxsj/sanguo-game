import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { getUserForToken, loginWithCode } from './auth/service.js';
import { prisma } from './db.js';
import { registerRealtimeGateway } from './realtime/gateway.js';
import { BattleService } from './services/battleService.js';
import { loadPolicy, startTraining, trainingStatus } from './agents/training.js';

const loginSchema = z.object({ phone: z.string(), code: z.string() });
const createBattleSchema = z.object({
  title: z.string().trim().min(2).max(40),
  columns: z.number().int().min(5).max(11),
  rows: z.number().int().min(4).max(8),
  agentCount: z.number().int().min(2).max(16),
  maxTurns: z.number().int().min(0).max(100).default(0),
  playerAgentId: z.string().regex(/^agent-([1-9]|1[0-6])$/).optional(),
}).refine(input=>!input.playerAgentId||Number(input.playerAgentId.slice(6))<=input.agentCount,{message:'所选君主不在本剧本中',path:['playerAgentId']});
const cityId=z.number().int().min(0);
const actionSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('raise-army'),cityId,commanderId:z.string().min(1).optional()}).strict(),
  z.object({type:z.literal('order-army'),armyId:z.string().min(1),toCityId:cityId,stopProgress:z.number().min(.1).max(.9).optional()}).strict(),
  z.object({type:z.literal('army-stance'),armyId:z.string().min(1),stance:z.enum(['camp','ambush'])}).strict(),
  z.object({type:z.literal('recruit-army'),armyId:z.string().min(1),amount:z.number().int().min(1).max(100),unitType:z.enum(['spear','sword','archer','cavalry']).optional()}).strict(),
  z.object({type:z.literal('found-kingdom'),name:z.string().regex(/^[\p{Script=Han}]{1,6}$/u)}).strict(),
  z.object({type:z.literal('move-capital'),cityId}).strict(),
  z.object({type:z.literal('recruit-character'),characterId:z.string().min(1)}).strict(),
  z.object({type:z.literal('appoint-court'),characterId:z.string().min(1),office:z.enum(['chancellor','marshal','treasurer'])}).strict(),
  z.object({type:z.literal('dismiss-court'),characterId:z.string().min(1)}).strict(),
  z.object({type:z.literal('recall-army'),armyId:z.string().min(1)}).strict(),
  z.object({type:z.literal('form-union'),personId:z.string(),partnerId:z.string(),kind:z.enum(['spouse','concubine'])}).strict(),
  z.object({type:z.literal('buy-equipment'),templateId:z.string()}).strict(),
  z.object({type:z.literal('equip-equipment'),characterId:z.string(),itemId:z.string()}).strict(),
  z.object({type:z.literal('unequip-equipment'),characterId:z.string(),slot:z.enum(['weapon','mount','treasure'])}).strict(),
  z.object({type:z.literal('diplomacy'),targetAgentId:z.string(),treaty:z.enum(['war','peace','alliance','trade']),offer:z.number().int().min(0),marriage:z.object({personId:z.string(),partnerId:z.string()}).strict().optional()}).strict(),
  z.object({type:z.literal('respond-diplomacy'),offerId:z.string(),accept:z.boolean()}).strict(),
  z.object({type:z.literal('appoint-governor'),characterId:z.string(),cityId:z.number().int().min(0)}).strict(),
  z.object({type:z.literal('dismiss-governor'),characterId:z.string()}).strict(),
  z.object({type:z.literal('reward-character'),characterId:z.string()}).strict(),
  z.object({type:z.literal('release-captive'),characterId:z.string()}).strict(),
  z.object({type:z.literal('recruit-captive'),characterId:z.string()}).strict(),
  z.object({type:z.literal('hold')}).strict(),
  z.object({type:z.literal('recruit'),cityId,amount:z.number().int().positive(),unitType:z.enum(['spear','sword','archer','cavalry']).optional()}).strict(),
  z.object({type:z.literal('develop'),cityId,building:z.enum(['farm','market','barracks']).optional()}).strict(),
  z.object({type:z.literal('move'),fromCityId:cityId,toCityId:cityId,troops:z.number().int().positive(),commanderId:z.string().min(1).optional()}).strict(),
  z.object({type:z.literal('attack'),fromCityId:cityId,toCityId:cityId,troops:z.number().int().positive(),commanderId:z.string().min(1).optional()}).strict(),
]);
const turnSchema = z.object({ expectedVersion: z.number().int().min(0),order:z.object({agentId:z.string(),action:actionSchema}).strict().optional() }).strict();

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
  void app.register(registerRealtimeGateway);

  app.setErrorHandler((error, _request, reply) => {
    const code = error instanceof z.ZodError ? 'VALIDATION_ERROR' : error.message;
    const status = code === 'VERSION_CONFLICT' ? 409 : code.endsWith('_NOT_FOUND') ? 404 : code.startsWith('INVALID_') || code === 'VALIDATION_ERROR' ? 400 : 500;
    void reply.code(status).send({ error: { code, message: code === 'VALIDATION_ERROR' ? '请求参数不合法' : error.message } });
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'agent-arena-api' }));
  app.get('/api/training', async (request, reply) => {
    if (!await authenticatedUser(request,reply)) return;
    return { ...trainingStatus(), policy: await loadPolicy() };
  });
  app.post('/api/training', async (request, reply) => {
    if (!await authenticatedUser(request,reply)) return;
    const { episodes } = z.object({ episodes: z.number().int().min(10).max(2000) }).parse(request.body);
    try{void startTraining(episodes).done.catch(() => undefined);}
    catch(error){
      const code=error instanceof Error?error.message:'';
      if(code==='TRAINING_BUSY'||code==='TRAINING_LOCK_STALE')return reply.code(409).send({error:{code,message:code==='TRAINING_BUSY'?'已有训练正在进行':'上次训练异常退出，请检查并清理失效训练锁'}});
      throw error;
    }
    return reply.code(202).send({ ...trainingStatus() });
  });
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
    const { expectedVersion,order } = turnSchema.parse(request.body);
    return battles.executeTurn(user.id, request.params.id, expectedVersion,order);
  });
  app.get<{ Params: { id: string }; Querystring: { turn?: string } }>('/api/battles/:id/replay', async (request, reply) => {
    const user = await authenticatedUser(request, reply);
    if (!user) return;
    const turn = z.coerce.number().int().min(0).parse(request.query.turn ?? '0');
    return battles.replay(user.id, request.params.id, turn);
  });

  const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (existsSync(webRoot)) {
    void app.register(fastifyStatic, { root: webRoot });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/ws') || request.url.startsWith('/assets/') || request.url.startsWith('/models/')) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: '接口不存在' } });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

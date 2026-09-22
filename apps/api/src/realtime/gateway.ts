import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import { getUserForToken } from '../auth/service.js';
import { prisma } from '../db.js';
import { battleEventBus } from './eventBus.js';

export async function registerRealtimeGateway(app: FastifyInstance) {
  await app.register(websocket);
  app.get<{ Querystring: { battleId?: string; after?: string } }>(
    '/ws',
    { websocket: true },
    async (socket, request) => {
      const user = await getUserForToken(prisma, request.cookies.arena_session);
      const battleId = request.query.battleId;
      if (!user || !battleId) {
        socket.close(1008, 'AUTH_REQUIRED');
        return;
      }
      const battle = await prisma.battle.findFirst({ where: { id: battleId, ownerId: user.id } });
      if (!battle) {
        socket.close(1008, 'BATTLE_NOT_FOUND');
        return;
      }
      const after = Number(request.query.after ?? 0);
      for (const event of battleEventBus.after(battleId, Number.isFinite(after) ? after : 0)) {
        socket.send(JSON.stringify({ type: 'battle-event', event }));
      }
      const unsubscribe = battleEventBus.subscribe(battleId, (event) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify({ type: 'battle-event', event }));
      });
      socket.on('close', unsubscribe);
    },
  );
}

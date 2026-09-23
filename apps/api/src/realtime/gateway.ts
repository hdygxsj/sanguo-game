import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import { getUserForToken } from '../auth/service.js';
import { prisma } from '../db.js';
import { battleEventBus } from './eventBus.js';

export function sessionTokenFromCookieHeader(header: string | undefined): string | undefined {
  const entry = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith('arena_session='));
  if (!entry) return undefined;
  return decodeURIComponent(entry.slice('arena_session='.length));
}

export function realtimeQueryFromUrl(url: string): { battleId?: string; after: number } {
  const query = new URL(url, 'http://agent-arena.local').searchParams;
  const after = Number(query.get('after') ?? 0);
  const battleId = query.get('battleId') ?? undefined;
  return { battleId, after: Number.isFinite(after) ? after : 0 };
}

export async function registerRealtimeGateway(app: FastifyInstance) {
  await app.register(websocket);
  app.get<{ Querystring: { battleId?: string; after?: string } }>(
    '/ws',
    { websocket: true },
    async (socket, request) => {
      const sessionToken = request.cookies?.arena_session ?? sessionTokenFromCookieHeader(request.headers.cookie);
      const user = await getUserForToken(prisma, sessionToken);
      const fallbackQuery = realtimeQueryFromUrl(request.url);
      const battleId = request.query?.battleId ?? fallbackQuery.battleId;
      if (!user || !battleId) {
        socket.close(1008, 'AUTH_REQUIRED');
        return;
      }
      const battle = await prisma.battle.findFirst({ where: { id: battleId, ownerId: user.id } });
      if (!battle) {
        socket.close(1008, 'BATTLE_NOT_FOUND');
        return;
      }
      const after = Number(request.query?.after ?? fallbackQuery.after);
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

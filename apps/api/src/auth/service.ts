import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export const DEVELOPMENT_CODE = '246810';

export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export async function loginWithCode(prisma: PrismaClient, phone: string, code: string) {
  if (!isValidPhone(phone)) throw new Error('INVALID_PHONE');
  if (code !== DEVELOPMENT_CODE) throw new Error('INVALID_CODE');

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone, displayName: `诸城玩家 ${phone.slice(-4)}` },
  });
  const token = randomUUID();
  const session = await prisma.session.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  return { user, session };
}

export async function getUserForToken(prisma: PrismaClient, token?: string) {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

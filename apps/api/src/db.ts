import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = path.resolve(moduleDirectory, '../prisma/dev.db');

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? `file:${defaultDatabasePath}`,
    },
  },
});

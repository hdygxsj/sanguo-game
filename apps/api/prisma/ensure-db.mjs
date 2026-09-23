import { closeSync, mkdirSync, openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

if (databaseUrl.startsWith('file:')) {
  const schemaDirectory = path.dirname(fileURLToPath(new URL('./schema.prisma', import.meta.url)));
  const databasePath = databaseUrl.slice('file:'.length).split('?')[0];
  const resolvedPath = path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(schemaDirectory, databasePath);

  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  closeSync(openSync(resolvedPath, 'a'));
}

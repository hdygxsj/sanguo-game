import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 8787);
const app = buildServer();

await app.listen({ host: '0.0.0.0', port });

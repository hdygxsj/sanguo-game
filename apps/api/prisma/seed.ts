import { PrismaClient } from '@prisma/client';
import { BattleService } from '../src/services/battleService.js';

const prisma = new PrismaClient();

async function seed() {
  const user = await prisma.user.upsert({
    where: { phone: '13800138000' },
    update: { displayName: 'Arena 体验官' },
    create: { phone: '13800138000', displayName: 'Arena 体验官' },
  });
  const demoBattle = await prisma.battle.findFirst({ where: { ownerId: user.id, title: '群雄逐鹿' } });
  if (!demoBattle) {
    await new BattleService(prisma).create(user.id, {
      title: '群雄逐鹿',
      columns: 7,
      rows: 5,
      agentCount: 4,
      maxTurns: 30,
    });
  }
  console.log(`Seeded Agent Arena for ${user.displayName}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

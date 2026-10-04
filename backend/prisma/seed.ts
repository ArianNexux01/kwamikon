import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TICKET_TYPES = [
  {
    name: 'Individual',
    description: 'Passe de 1 pessoa, válido para os dois dias do Kwamikon Nexus.',
    refPrice: 7000,
    peopleCount: 1,
    sortOrder: 1,
  },
  {
    name: 'SpyFamily',
    description: 'Passe de família: 2 adultos e 2 crianças.',
    refPrice: 20000,
    peopleCount: 4,
    sortOrder: 2,
  },
  {
    name: 'Guilda',
    description: 'Passe de grupo para 4 pessoas — reúne a tua guilda.',
    refPrice: 22000,
    peopleCount: 4,
    sortOrder: 3,
  },
  {
    name: 'Bando',
    description: 'Passe de grupo para 8 pessoas — o bando todo dentro do Nexus.',
    refPrice: 40000,
    peopleCount: 8,
    sortOrder: 4,
  },
];

async function main() {
  for (const type of TICKET_TYPES) {
    // O seed corre em cada arranque do container: o preço só é definido na criação,
    // para não apagar os preços alterados pelo organizador no backoffice.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refPrice, ...rest } = type;
    await prisma.ticketType.upsert({
      where: { id: type.name },
      update: rest,
      create: { id: type.name, ...type },
    });
  }

  const organizadorPassword = process.env.SEED_ORG_PASSWORD ?? 'nexus2026admin';
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? 'nexus2026porta';

  await prisma.backofficeUser.upsert({
    where: { email: 'organizacao@kwamikon.ao' },
    update: {},
    create: {
      name: 'Organização Kwamikon',
      email: 'organizacao@kwamikon.ao',
      passwordHash: await bcrypt.hash(organizadorPassword, 10),
      role: 'ORGANIZADOR',
    },
  });

  await prisma.backofficeUser.upsert({
    where: { email: 'porta@kwamikon.ao' },
    update: {},
    create: {
      name: 'Staff de Porta',
      email: 'porta@kwamikon.ao',
      passwordHash: await bcrypt.hash(staffPassword, 10),
      role: 'STAFF_PORTA',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed concluído.');
  // eslint-disable-next-line no-console
  console.log('Organizador: organizacao@kwamikon.ao /', organizadorPassword);
  // eslint-disable-next-line no-console
  console.log('Staff de porta: porta@kwamikon.ao /', staffPassword);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

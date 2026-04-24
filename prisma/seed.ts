import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seed skipped: no seed data configured.");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// One-time update for the Corporate credit rescale (10,000 -> 5,000
// included, Scale Pack rescaled to stay the largest option). Safe to run
// more than once - it's an update by name, not an insert, so it never
// creates a duplicate row. Run this once against local, once against
// production, the same way seed-admin.ts gets run against both.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.creditPackage.updateMany({
    where: { name: "Scale Pack" },
    data: { credits: 7500, priceCents: 15500 }
  });
  console.log(`Updated ${result.count} Scale Pack row(s) to 7,500 credits / $155.00`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

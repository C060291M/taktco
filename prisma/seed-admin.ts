// Creates the real platform-admin account. Deliberately separate from
// prisma/seed.ts (which creates throwaway demo/dev data) - this is a real
// credential for a real person, not sample data, so it shouldn't run
// automatically as part of routine demo seeding.
//
// Run once, deliberately: npm run db:seed-admin
//
// The company created here ("TAKTCO HQ") is excluded from every platform
// stat on the Admin dashboard (revenue, user counts, tier breakdown) via its
// known subdomain - see ADMIN_INTERNAL_SUBDOMAIN in lib/admin.ts. It exists
// only so the admin User record has somewhere to belong, per the multi-tenant
// schema's requirement that every User has a companyId.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_INTERNAL_SUBDOMAIN = "taktco-hq";

async function main() {
  const passwordHash = await bcrypt.hash("LoveNoBlues57", 10);

  const company = await prisma.company.upsert({
    where: { subdomain: ADMIN_INTERNAL_SUBDOMAIN },
    update: {},
    create: {
      name: "TAKTCO HQ",
      subdomain: ADMIN_INTERNAL_SUBDOMAIN,
      tradeType: "Internal"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "munoz.holdco@gmail.com" },
    // update also resets the password hash, not just the admin flag - if this
    // email already existed (e.g. an earlier accidental signup with a
    // different password), running this script again is now a reliable way
    // to force it back to the known credentials rather than silently leaving
    // a mismatched password in place.
    update: { isPlatformAdmin: true, passwordHash, companyId: company.id },
    create: {
      companyId: company.id,
      email: "munoz.holdco@gmail.com",
      name: "Munoz57",
      passwordHash,
      role: "OWNER",
      isPlatformAdmin: true
    }
  });

  console.log(`Platform admin ready: ${user.email} (isPlatformAdmin: true)`);
  console.log("Change this password after first login - it was entered in a chat conversation, treat it as no longer private.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

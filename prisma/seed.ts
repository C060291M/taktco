import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const company = await prisma.company.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Ace Fence Co.",
      subdomain: "demo",
      tradeType: "Fencing",
      brandAccentColor: "#3B82F6",
      subscriptionTier: "growth",
      users: {
        create: {
          email: "owner@demo.novaos.app",
          passwordHash,
          name: "Alex Rivera",
          role: "OWNER"
        }
      }
    },
    include: { users: true }
  });

  const owner = company.users[0];

  const customer1 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Jordan Blake",
      email: "jordan.blake@example.com",
      phone: "555-0101",
      address: "412 Maple St",
      source: "Website form",
      leads: {
        create: {
          companyId: company.id,
          pipelineStage: "ESTIMATE_SENT",
          assignedUserId: owner.id,
          source: "Website form",
          notes: "Wants a 150ft cedar privacy fence, backyard."
        }
      }
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: "Morgan Lee",
      email: "morgan.lee@example.com",
      phone: "555-0102",
      address: "88 Birch Ave",
      source: "Referral",
      leads: {
        create: {
          companyId: company.id,
          pipelineStage: "NEW_LEAD",
          assignedUserId: owner.id,
          source: "Referral"
        }
      }
    }
  });

  const estimate = await prisma.estimate.create({
    data: {
      companyId: company.id,
      customerId: customer1.id,
      status: "APPROVED",
      totalAmount: 8400,
      approvedAt: new Date(),
      lineItems: [
        { description: "Cedar privacy fence - 150ft", qty: 150, unit: "ft", unitPrice: 48 },
        { description: "Gate install (2x)", qty: 2, unit: "ea", unitPrice: 300 }
      ]
    }
  });

  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      customerId: customer1.id,
      estimateId: estimate.id,
      status: "IN_PROGRESS",
      startDate: new Date(),
      quotedCost: 8400,
      actualCost: 6100,
      assignedUserIds: [owner.id]
    }
  });

  await prisma.invoice.create({
    data: {
      companyId: company.id,
      jobId: job.id,
      customerId: customer1.id,
      amount: 4200,
      status: "UNPAID",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });

  console.log("Seeded demo company: ace fence co. (subdomain: demo)");
  console.log("Login: owner@demo.novaos.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

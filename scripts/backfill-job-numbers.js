// One-off backfill: assigns JOB-0001 style numbers to Jobs created before
// Job.jobNumber existed. Run once against production, then it is safe to
// delete this file (it is idempotent - re-running only touches rows that
// still have a null jobNumber).
//
// Usage:
//   $env:DATABASE_URL = "<railway public url>"; node scripts/backfill-job-numbers.js
//
// Numbers are assigned per company in creation order, and the company's
// nextJobNumber counter is advanced past whatever was used so future jobs
// never collide with a backfilled one.
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany({ select: { id: true, name: true, nextJobNumber: true } });
  let totalUpdated = 0;

  for (const company of companies) {
    const jobs = await db.job.findMany({
      where: { companyId: company.id, jobNumber: null },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    if (jobs.length === 0) continue;

    let counter = company.nextJobNumber;
    for (const job of jobs) {
      const jobNumber = `JOB-${String(counter).padStart(4, "0")}`;
      await db.job.update({ where: { id: job.id }, data: { jobNumber } });
      console.log(`  ${company.name}: job ${job.id} -> ${jobNumber}`);
      counter++;
      totalUpdated++;
    }

    await db.company.update({ where: { id: company.id }, data: { nextJobNumber: counter } });
    console.log(`${company.name}: ${jobs.length} job(s) numbered, nextJobNumber now ${counter}`);
  }

  console.log(`\nDone. ${totalUpdated} job(s) backfilled across ${companies.length} company/companies.`);
}

main()
  .catch(function (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(function () {
    return db.$disconnect();
  });
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
db.aiFeatureCost.findMany().then(function (rows) {
  console.log(rows.length ? rows : "No overrides - defaults apply.");
}).catch(function (e) { console.error(e.message); }).finally(function () { return db.$disconnect(); });
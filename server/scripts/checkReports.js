const prisma = require('../config/prisma');

async function main() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log(`Total reports count: ${reports.length}`);
  reports.forEach((r, idx) => {
    console.log(`[${idx}] id=${r.id}, vendorId=${r.vendorId}, issueType="${r.issueType}", desc="${r.description?.slice(0, 50)}", created=${r.createdAt?.toISOString()}`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);

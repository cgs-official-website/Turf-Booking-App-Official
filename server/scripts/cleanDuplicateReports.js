const prisma = require('../config/prisma');

async function cleanDuplicates() {
  console.log('🧹 Scanning and cleaning duplicate reports & enquiries in PostgreSQL...');

  // 1. Clean duplicate reports
  const allReports = await prisma.report.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenReportKeys = new Set();
  const duplicateReportIds = [];

  for (const r of allReports) {
    // Generate a deduplication fingerprint
    const key = `${r.vendorId || ''}__${r.issueType}__${r.description.trim()}`;
    if (seenReportKeys.has(key)) {
      duplicateReportIds.push(r.id);
    } else {
      seenReportKeys.add(key);
    }
  }

  if (duplicateReportIds.length > 0) {
    console.log(`Found ${duplicateReportIds.length} duplicate report(s):`, duplicateReportIds);
    await prisma.report.deleteMany({
      where: { id: { in: duplicateReportIds } },
    });
    console.log(`✅ Successfully deleted ${duplicateReportIds.length} duplicate report(s) from PostgreSQL!`);
  } else {
    console.log('No duplicate reports found.');
  }

  // 2. Clean duplicate vendor_enquiries
  const allEnquiries = await prisma.vendorEnquiry.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenEnquiryKeys = new Set();
  const duplicateEnquiryIds = [];

  for (const e of allEnquiries) {
    const key = `${e.vendorMobile}__${e.turfName.trim()}__${e.message?.trim()}`;
    if (seenEnquiryKeys.has(key)) {
      duplicateEnquiryIds.push(e.id);
    } else {
      seenEnquiryKeys.add(key);
    }
  }

  if (duplicateEnquiryIds.length > 0) {
    console.log(`Found ${duplicateEnquiryIds.length} duplicate enquiry record(s):`, duplicateEnquiryIds);
    await prisma.vendorEnquiry.deleteMany({
      where: { id: { in: duplicateEnquiryIds } },
    });
    console.log(`✅ Successfully deleted ${duplicateEnquiryIds.length} duplicate enquiry record(s) from PostgreSQL!`);
  } else {
    console.log('No duplicate enquiries found.');
  }

  const remaining = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
  console.log(`\nRemaining unique reports (${remaining.length}):`);
  remaining.forEach((r) => {
    console.log(`- [${r.id}] ${r.issueType}: "${r.description.slice(0, 40)}..." (${r.createdAt.toISOString()})`);
  });

  await prisma.$disconnect();
}

cleanDuplicates().catch(console.error);

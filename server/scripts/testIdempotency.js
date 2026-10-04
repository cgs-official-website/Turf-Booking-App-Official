const prisma = require('../config/prisma');
const vendorController = require('../controllers/vendorController');
const enquiryController = require('../controllers/enquiryController');

async function testIdempotency() {
  console.log('🧪 Testing Enquiry and Report submission deduplication...');

  const mockReqEnquiry = {
    body: {
      turfName: 'Test Deduplication Turf',
      vendorName: 'Test Owner',
      vendorMobile: '9876543210',
      vendorLocation: 'Chennai',
      message: 'Test enquiry message for deduplication check',
    },
  };

  let firstEnquiryReportId = null;
  let secondEnquiryReportId = null;

  const mockRes1 = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      firstEnquiryReportId = data?.data?.enquiry?.id;
      return this;
    },
  };

  const mockRes2 = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      secondEnquiryReportId = data?.data?.enquiry?.id;
      return this;
    },
  };

  // Call 1
  await enquiryController.createVendorEnquiry(mockReqEnquiry, mockRes1);
  // Immediate Call 2 (simulating double click or rapid network retry)
  await enquiryController.createVendorEnquiry(mockReqEnquiry, mockRes2);

  console.log(`Call 1 Enquiry ID: ${firstEnquiryReportId}`);
  console.log(`Call 2 Enquiry ID: ${secondEnquiryReportId}`);

  if (firstEnquiryReportId === secondEnquiryReportId) {
    console.log('✅ PASS: Both rapid enquiry calls returned the SAME enquiry ID! Zero duplicates created!');
  } else {
    console.error('❌ FAIL: Two different enquiry IDs were created!');
  }

  // Count how many entries exist in DB for this phone
  const countInDb = await prisma.vendorEnquiry.count({
    where: { vendorMobile: '9876543210', turfName: 'Test Deduplication Turf' },
  });
  console.log(`Database records created: ${countInDb} (Expected: 1)`);

  // Clean up test records
  await prisma.vendorEnquiry.deleteMany({ where: { vendorMobile: '9876543210' } });
  await prisma.report.deleteMany({ where: { description: { contains: 'Test Deduplication Turf' } } });

  await prisma.$disconnect();
}

testIdempotency().catch(console.error);

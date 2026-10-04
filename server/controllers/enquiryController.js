const prisma = require('../config/prisma');
const { sendSuccess, sendError } = require('../utils/response');

const enquiryController = {
  /**
   * POST /api/v1/enquiries or /api/v1/vendor-enquiries
   * Submit prospective vendor enquiry
   */
  async createVendorEnquiry(req, res, next) {
    try {
      const {
        turfName,
        vendorName,
        vendorMobile,
        phone,
        mobile,
        vendorLocation,
        location,
        message,
      } = req.body || {};

      const rawPhone = vendorMobile || phone || mobile || '';
      const rawLocation = vendorLocation || location || '';

      const cleanTurfName = String(turfName || '').trim();
      const cleanVendorName = String(vendorName || '').trim();
      const cleanPhone = String(rawPhone).replace(/\D/g, '');
      const cleanLocation = String(rawLocation).trim();
      const cleanMessage = String(message || '').trim();

      const errors = {};
      if (!cleanTurfName) {
        errors.turfName = 'Turf Name is required';
      }
      if (!cleanVendorName) {
        errors.vendorName = 'Vendor Name is required';
      }
      if (!cleanPhone) {
        errors.vendorMobile = 'Vendor Mobile number is required';
      } else if (cleanPhone.length !== 10) {
        errors.vendorMobile = 'Vendor Mobile must be exactly 10 digits';
      }
      if (!cleanLocation) {
        errors.vendorLocation = 'Vendor Location is required';
      }
      if (!cleanMessage) {
        errors.message = 'Message is required';
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: Object.values(errors)[0],
            details: errors,
          },
        });
      }

      // Prevent duplicate enquiries within a 60-second window
      const recentEnquiry = await prisma.vendorEnquiry.findFirst({
        where: {
          vendorMobile: cleanPhone,
          turfName: cleanTurfName,
          createdAt: {
            gte: new Date(Date.now() - 60000),
          },
        },
      });

      if (recentEnquiry) {
        return sendSuccess(
          res,
          {
            enquiry: recentEnquiry,
            message: 'Your enquiry has already been received. Our team will contact you shortly.',
          },
          200
        );
      }

      const enquiryId = `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reportId = `RPT-ENQ-${Date.now()}`;

      // 1. Store in vendor_enquiries table
      const enquiry = await prisma.vendorEnquiry.create({
        data: {
          id: enquiryId,
          turfName: cleanTurfName,
          vendorName: cleanVendorName,
          vendorMobile: cleanPhone,
          vendorLocation: cleanLocation,
          message: cleanMessage,
          status: 'pending',
        },
      });

      // 2. Store in reports table so it automatically routes to Superadmin Issue Reports module
      const report = await prisma.report.create({
        data: {
          id: reportId,
          vendorId: null, // Prospective vendor doesn't have an approved vendor account yet
          issueType: 'Vendor Enquiry',
          category: 'Vendor Enquiry',
          description: `[Prospective Partner Enquiry]\nFacility / Turf: ${cleanTurfName}\nOwner / Contact: ${cleanVendorName} (${cleanPhone})\nLocation: ${cleanLocation}\n\nEnquiry Details:\n${cleanMessage}`,
          contactInfo: {
            turfName: cleanTurfName,
            vendorName: cleanVendorName,
            vendorMobile: cleanPhone,
            vendorLocation: cleanLocation,
            message: cleanMessage,
            enquiryId: enquiry.id,
          },
          status: 'open',
        },
      });

      return sendSuccess(
        res,
        {
          enquiry,
          report,
          message: 'Vendor enquiry submitted successfully and forwarded to administration',
        },
        201
      );
    } catch (err) {
      console.error('Error submitting vendor enquiry:', err);
      return sendError(res, err.message || 'Failed to submit enquiry', 500, 'ENQUIRY_SUBMIT_FAILED');
    }
  },

  /**
   * GET /api/v1/enquiries
   * Retrieve vendor enquiries (Admin view)
   */
  async getAllEnquiries(req, res, next) {
    try {
      const enquiries = await prisma.vendorEnquiry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return sendSuccess(res, {
        enquiries,
        total: enquiries.length,
      });
    } catch (err) {
      console.error('Error fetching enquiries:', err);
      return sendError(res, 'Failed to fetch enquiries', 500, 'FETCH_ENQUIRIES_FAILED');
    }
  },
};

module.exports = enquiryController;

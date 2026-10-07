const prisma = require('../config/prisma');
const { sendSuccess, sendError } = require('../utils/response');

function parseEnquiryMetadata(rawMessage = '') {
  let email = '';
  let userType = 'General';
  let sourcePage = 'Landing Page';
  let module = 'General';
  let cleanMsg = String(rawMessage || '');

  // Extract [Email: xxx]
  const emailMatch = cleanMsg.match(/\[Email:\s*([^\]]+)\]/i);
  if (emailMatch) {
    email = emailMatch[1].trim();
    cleanMsg = cleanMsg.replace(emailMatch[0], '');
  }

  // Extract [Role: xxx]
  const roleMatch = cleanMsg.match(/\[Role:\s*([^\]]+)\]/i);
  if (roleMatch) {
    userType = roleMatch[1].trim();
    cleanMsg = cleanMsg.replace(roleMatch[0], '');
  }

  // Extract [Source: xxx]
  const sourceMatch = cleanMsg.match(/\[Source:\s*([^\]]+)\]/i);
  if (sourceMatch) {
    sourcePage = sourceMatch[1].trim();
    cleanMsg = cleanMsg.replace(sourceMatch[0], '');
  }

  // Extract [Module: xxx]
  const moduleMatch = cleanMsg.match(/\[Module:\s*([^\]]+)\]/i);
  if (moduleMatch) {
    module = moduleMatch[1].trim();
    cleanMsg = cleanMsg.replace(moduleMatch[0], '');
  }

  return {
    email,
    userType,
    sourcePage,
    module,
    cleanMessage: cleanMsg.trim(),
  };
}

const enquiryController = {
  /**
   * POST /api/v1/enquiries or /api/v1/vendor-enquiries
   * Submit enquiry from landing page, lead form, or prospective vendor
   */
  async createEnquiry(req, res, next) {
    try {
      const {
        name,
        vendorName,
        fullName,
        email,
        phone,
        vendorMobile,
        mobile,
        turfName,
        location,
        vendorLocation,
        userType,
        role,
        message,
        description,
        sourcePage,
        module,
      } = req.body || {};

      const cleanName = String(name || vendorName || fullName || '').trim();
      const rawPhone = String(phone || vendorMobile || mobile || '').trim();
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanUserType = String(userType || role || 'Player').trim();
      let cleanMessage = String(message || description || '').trim();
      if (!cleanMessage) {
        cleanMessage = `Prospective ${cleanUserType} inquiry submitted via landing page.`;
      }
      const cleanLocation = String(location || vendorLocation || (cleanEmail ? cleanEmail : 'Online')).trim();
      const cleanSource = String(sourcePage || 'Landing Page — Contact Desk').trim();
      const cleanModule = String(module || 'General').trim();

      const defaultTurf =
        cleanUserType.toLowerCase().includes('vendor') || cleanUserType.toLowerCase().includes('owner')
          ? 'Partner Facility'
          : `${cleanUserType} Inquiry`;
      const cleanTurfName = String(turfName || defaultTurf).trim();

      const errors = {};
      if (!cleanName) {
        errors.name = 'Full Name is required';
      }
      if (!cleanPhone && !cleanEmail) {
        errors.contact = 'Please provide either a phone number or email address';
      }
      if (cleanPhone && cleanPhone.length < 7) {
        errors.phone = 'Please provide a valid phone number';
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

      // Format payload to preserve full metadata in vendor_enquiries table
      const metaHeader = `[Role: ${cleanUserType}] [Email: ${cleanEmail || 'N/A'}] [Source: ${cleanSource}] [Module: ${cleanModule}]\n\n`;
      const storedMessage = `${metaHeader}${cleanMessage}`;

      const enquiryId = `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reportId = `RPT-ENQ-${Date.now()}`;

      // 1. Store in vendor_enquiries table
      const enquiry = await prisma.vendorEnquiry.create({
        data: {
          id: enquiryId,
          turfName: cleanTurfName,
          vendorName: cleanName,
          vendorMobile: cleanPhone || (cleanEmail ? cleanEmail.slice(0, 32) : 'N/A'),
          vendorLocation: cleanLocation,
          message: storedMessage,
          status: 'pending',
        },
      });

      // 2. Also register in reports table for unified tracking
      const report = await prisma.report.create({
        data: {
          id: reportId,
          vendorId: null,
          issueType: `${cleanUserType} Inquiry`,
          category: 'Inquiry Lead',
          description: `[Ecosystem Inquiry — ${cleanUserType}]\nSubmitter: ${cleanName}\nEmail: ${cleanEmail || 'N/A'}\nPhone: ${cleanPhone || 'N/A'}\nLocation: ${cleanLocation}\nFacility/Topic: ${cleanTurfName}\n\nMessage:\n${cleanMessage}`,
          contactInfo: {
            enquiryId: enquiry.id,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            userType: cleanUserType,
            turfName: cleanTurfName,
            location: cleanLocation,
            message: cleanMessage,
            sourcePage: cleanSource,
            module: cleanModule,
          },
          status: 'open',
        },
      });

      return sendSuccess(
        res,
        {
          enquiry: {
            id: enquiry.id,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            userType: cleanUserType,
            turfName: cleanTurfName,
            location: cleanLocation,
            message: cleanMessage,
            sourcePage: cleanSource,
            module: cleanModule,
            status: enquiry.status,
            createdAt: enquiry.createdAt,
          },
          reportId: report.id,
          message: 'Your inquiry has been submitted successfully! Our desk will review and contact you shortly.',
        },
        201
      );
    } catch (err) {
      console.error('Error submitting enquiry:', err);
      return sendError(res, err.message || 'Failed to submit enquiry', 500, 'ENQUIRY_SUBMIT_FAILED');
    }
  },

  /**
   * Alias for backward compatibility
   */
  async createVendorEnquiry(req, res, next) {
    return enquiryController.createEnquiry(req, res, next);
  },

  /**
   * GET /api/v1/enquiries
   * Retrieve all enquiries (Admin view)
   */
  async getAllEnquiries(req, res, next) {
    try {
      const { status, search } = req.query;
      const where = {};
      if (status && status !== 'all') {
        where.status = status;
      }

      const enquiries = await prisma.vendorEnquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const formatted = enquiries.map((e) => {
        const meta = parseEnquiryMetadata(e.message);
        return {
          id: e.id,
          name: e.vendorName,
          phone: e.vendorMobile === 'N/A' ? '' : e.vendorMobile,
          email: meta.email,
          userType: meta.userType || 'Player',
          turfName: e.turfName,
          location: e.vendorLocation,
          message: meta.cleanMessage || e.message || '',
          sourcePage: meta.sourcePage,
          module: meta.module,
          status: e.status || 'pending',
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        };
      });

      // Optional search filter
      let result = formatted;
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        result = formatted.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.email.toLowerCase().includes(q) ||
            item.phone.toLowerCase().includes(q) ||
            item.turfName.toLowerCase().includes(q) ||
            item.location.toLowerCase().includes(q) ||
            item.message.toLowerCase().includes(q) ||
            item.userType.toLowerCase().includes(q)
        );
      }

      return sendSuccess(res, {
        enquiries: result,
        total: result.length,
      });
    } catch (err) {
      console.error('Error fetching enquiries:', err);
      return sendError(res, 'Failed to fetch enquiries', 500, 'FETCH_ENQUIRIES_FAILED');
    }
  },

  /**
   * PATCH /api/v1/enquiries/:id
   * Update enquiry status (pending, contacted, resolved, closed)
   */
  async updateEnquiryStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return sendError(res, 'Status is required', 400, 'STATUS_REQUIRED');
      }

      const existing = await prisma.vendorEnquiry.findUnique({
        where: { id },
      });

      if (!existing) {
        return sendError(res, 'Enquiry not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.vendorEnquiry.update({
        where: { id },
        data: {
          status: String(status).toLowerCase(),
          updatedAt: new Date(),
        },
      });

      return sendSuccess(res, {
        enquiry: updated,
        message: `Enquiry status updated to ${status}`,
      });
    } catch (err) {
      console.error('Error updating enquiry status:', err);
      return sendError(res, err.message || 'Failed to update enquiry status', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * DELETE /api/v1/enquiries/:id
   * Delete an enquiry
   */
  async deleteEnquiry(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await prisma.vendorEnquiry.findUnique({
        where: { id },
      });

      if (!existing) {
        return sendError(res, 'Enquiry not found', 404, 'NOT_FOUND');
      }

      await prisma.vendorEnquiry.delete({
        where: { id },
      });

      return sendSuccess(res, {
        id,
        message: 'Enquiry deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting enquiry:', err);
      return sendError(res, err.message || 'Failed to delete enquiry', 500, 'DELETE_FAILED');
    }
  },
};

module.exports = enquiryController;

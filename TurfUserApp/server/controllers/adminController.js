const Vendor = require('../models/Vendor');
const Turf = require('../models/Turf');

// GET /api/admin/vendors/pending — vendors whose identity KYC needs review
exports.getPendingVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ 'kyc.identity.status': 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, vendors });
  } catch (err) {
    console.error('getPendingVendors error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/turfs/pending — turfs (with vendor + KYC docs) waiting for review
exports.getPendingTurfs = async (req, res) => {
  try {
    const turfs = await Turf.find({ status: 'pending' })
      .populate('vendor', 'name email phone businessName gstNumber kyc')
      .sort({ createdAt: -1 });
    res.json({ success: true, turfs });
  } catch (err) {
    console.error('getPendingTurfs error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/turfs/:id — full detail (turf + vendor + all KYC docs) for one review card
exports.getTurfDetail = async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id).populate('vendor');
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    res.json({ success: true, turf });
  } catch (err) {
    console.error('getTurfDetail error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/vendors/:id/approve
exports.approveVendorKyc = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { 'kyc.identity.status': 'approved', isVerified: true, status: 'active' },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, vendor });
  } catch (err) {
    console.error('approveVendorKyc error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/vendors/:id/reject   body: { reason }
exports.rejectVendorKyc = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { 'kyc.identity.status': 'rejected' },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, vendor });
  } catch (err) {
    console.error('rejectVendorKyc error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/turfs/:id/approve
// This is the "super admin checks everything and hits OK" action — flips the
// turf (and its business KYC) to approved/active so it (a) shows up for
// users to book and (b) flips the vendor app from the "Under review" screen
// to the "Turf Approved" screen on its next status poll.
exports.approveTurf = async (req, res) => {
  try {
    const turf = await Turf.findByIdAndUpdate(
      req.params.id,
      {
        status: 'active',
        isActive: true,
        'kyc.status': 'approved',
        reviewedAt: new Date(),
        rejectionReason: undefined,
      },
      { new: true }
    );
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    res.json({ success: true, turf });
  } catch (err) {
    console.error('approveTurf error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/turfs/:id/reject   body: { reason }
exports.rejectTurf = async (req, res) => {
  try {
    const { reason } = req.body;
    const turf = await Turf.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        isActive: false,
        'kyc.status': 'rejected',
        reviewedAt: new Date(),
        rejectionReason: reason || 'Documents did not pass review',
      },
      { new: true }
    );
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    res.json({ success: true, turf });
  } catch (err) {
    console.error('rejectTurf error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getPendingVendors,
  getPendingTurfs,
  getTurfDetail,
  approveVendorKyc,
  rejectVendorKyc,
  approveTurf,
  rejectTurf,
} = require('../controllers/adminController');

// All admin routes require the x-admin-secret header (see middleware/adminAuth.js)
router.use(adminAuth);

router.get('/vendors/pending', getPendingVendors);
router.patch('/vendors/:id/approve', approveVendorKyc);
router.patch('/vendors/:id/reject', rejectVendorKyc);

router.get('/turfs/pending', getPendingTurfs);
router.get('/turfs/:id', getTurfDetail);
router.patch('/turfs/:id/approve', approveTurf);
router.patch('/turfs/:id/reject', rejectTurf);

module.exports = router;
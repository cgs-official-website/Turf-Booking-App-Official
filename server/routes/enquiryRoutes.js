const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const verifySessionToken = require('../middleware/verifySessionToken');
const requireAdmin = require('../middleware/requireAdmin');

// Public route: Submit enquiry (Player, Vendor, Corporate, Franchise)
router.post('/', enquiryController.createEnquiry);
router.post('/vendor', enquiryController.createEnquiry);
router.post('/submit', enquiryController.createEnquiry);

// Protected admin routes: List, update status, and delete enquiries
router.get('/', verifySessionToken, requireAdmin, enquiryController.getAllEnquiries);
router.patch('/:id', verifySessionToken, requireAdmin, enquiryController.updateEnquiryStatus);
router.put('/:id/status', verifySessionToken, requireAdmin, enquiryController.updateEnquiryStatus);
router.delete('/:id', verifySessionToken, requireAdmin, enquiryController.deleteEnquiry);

module.exports = router;

const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const verifySessionToken = require('../middleware/verifySessionToken');
const requireAdmin = require('../middleware/requireAdmin');

// Public route: Submit prospective vendor enquiry
router.post('/', enquiryController.createVendorEnquiry);
router.post('/vendor', enquiryController.createVendorEnquiry);

// Protected admin route: List enquiries
router.get('/', verifySessionToken, requireAdmin, enquiryController.getAllEnquiries);

module.exports = router;

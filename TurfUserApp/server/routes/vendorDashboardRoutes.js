const express = require('express');
const router = express.Router();
const { getDashboardStats, getRevenue } = require('../controllers/vendorDashboardController');
const vendorAuth = require('../middleware/vendorAuth');

router.use(vendorAuth);

router.get('/stats', getDashboardStats);
router.get('/revenue', getRevenue);

module.exports = router;
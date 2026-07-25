const express = require('express');
const router = express.Router();
const {
  getIssueTypes,
  submitReport,
  getMyReports,
  getReportById,
} = require('../controllers/reportController');
const vendorAuth = require('../middleware/vendorAuth');

// All report endpoints require a logged-in vendor
router.use(vendorAuth);

router.get('/issue-types', getIssueTypes);
router.post('/', submitReport);
router.get('/', getMyReports);
router.get('/:id', getReportById);

module.exports = router;
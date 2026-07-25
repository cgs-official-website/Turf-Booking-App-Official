const Report = require('../models/Report');

// Generates a short, human-friendly ticket id like "APP-1023".
// Retries on the (very unlikely) chance of a collision since reportId is
// unique-indexed on the model.
const generateReportId = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const candidate = `APP-${suffix}`;
    const exists = await Report.exists({ reportId: candidate });
    if (!exists) return candidate;
  }
  // Extremely unlikely fallback — timestamp-based, guaranteed unique enough.
  return `APP-${Date.now().toString().slice(-6)}`;
};

// GET /api/vendor/reports/issue-types
// Lets the frontend render the dropdown from a single source of truth
// instead of hardcoding the list in the app.
exports.getIssueTypes = async (req, res) => {
  res.json({ success: true, issueTypes: Report.ISSUE_TYPES });
};

// POST /api/vendor/reports
// Body: { issueType, description }
exports.submitReport = async (req, res) => {
  try {
    const { issueType, description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const reportId = await generateReportId();

    const report = await Report.create({
      reportId,
      vendor: req.vendor._id,
      issueType: issueType || 'All issues',
      description: description.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report,
    });
  } catch (err) {
    console.error('submitReport error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/reports
// Vendor's own report history (not used by the current design, but handy
// for a future "My Reports" list).
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ vendor: req.vendor._id }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/vendor/reports/:id
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, vendor: req.vendor._id });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
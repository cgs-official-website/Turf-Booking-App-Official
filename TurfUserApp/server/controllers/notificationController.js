const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Get my notifications
// @route   GET /api/notifications?type=&read=
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.type) query.type = req.query.type;
  if (req.query.read !== undefined) query.read = req.query.read === 'true';

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).populate('booking');
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

  res.json({ success: true, count: notifications.length, unreadCount, notifications });
});

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  notification.read = true;
  await notification.save();
  res.json({ success: true, notification });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
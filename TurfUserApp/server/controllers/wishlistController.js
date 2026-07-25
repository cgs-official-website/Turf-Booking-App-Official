const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Turf = require('../models/Turf');

// @desc    Get wishlist turfs
// @route   GET /api/wishlist
// @access  Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    match: { isActive: true },
  });
  res.json({ success: true, count: user.wishlist.length, wishlist: user.wishlist });
});

// @desc    Add a turf to wishlist
// @route   POST /api/wishlist/:turfId
// @access  Private
const addToWishlist = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.turfId);
  if (!turf) {
    res.status(404);
    throw new Error('Turf not found');
  }
  const user = await User.findById(req.user._id);
  if (!user.wishlist.includes(turf._id)) {
    user.wishlist.push(turf._id);
    await user.save();
  }
  res.json({ success: true, wishlist: user.wishlist });
});

// @desc    Remove a turf from wishlist
// @route   DELETE /api/wishlist/:turfId
// @access  Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.wishlist = user.wishlist.filter((id) => String(id) !== req.params.turfId);
  await user.save();
  res.json({ success: true, wishlist: user.wishlist });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
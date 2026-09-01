const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a 6-digit numeric OTP using CSPRNG
 * Range: 100000 to 999999
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash the 6-digit OTP using bcrypt with salt rounds = 10
 */
const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/**
 * Verify plain text OTP against the stored hash
 */
const verifyOtp = async (plainOtp, hashedOtp) => {
  if (!plainOtp || !hashedOtp) return false;
  return bcrypt.compare(String(plainOtp).trim(), hashedOtp);
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
};

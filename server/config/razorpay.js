const Razorpay = require('razorpay');
const dotenv = require('dotenv');

dotenv.config();

let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay client initialized');
} else {
  console.warn('⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in .env.');
}

module.exports = razorpay;

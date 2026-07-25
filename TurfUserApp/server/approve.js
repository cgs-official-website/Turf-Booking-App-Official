const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Booking = require('./models/Booking');
  
  // Latest pending booking approve பண்ணு
  const b = await Booking.findOneAndUpdate(
    { status: 'PendingApproval' },
    { status: 'Confirmed' },
    { new: true, sort: { createdAt: -1 } }
  );
  console.log('Updated:', b?.status, '| Ref:', b?.bookingRef);
  process.exit();
});
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { SubscriptionPlan, VendorSubscription } = require('../models/Subscription');
const Turf = require('../models/Turf');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

dotenv.config();

// ── Helper: generate time slots ───────────────────────────────────────────────
const generateSlots = (openHour, closeHour) => {
  const slots = [];
  for (let h = openHour; h < closeHour; h++) {
    slots.push({
      startTime: `${String(h).padStart(2, '0')}:00`,
      endTime:   `${String(h + 1).padStart(2, '0')}:00`,
      isAvailable: true,
    });
  }
  return slots;
};

// ── Helper: past date ─────────────────────────────────────────────────────────
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const run = async () => {
  await connectDB();

  // ── Clear all collections ──────────────────────────────────────────────────
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany(),
    Vendor.deleteMany(),
    SubscriptionPlan.deleteMany(),
    VendorSubscription.deleteMany(),
    Turf.deleteMany(),
    Booking.deleteMany(),
    Review.deleteMany(),
    Notification.deleteMany(),
  ]);

  // ── SUBSCRIPTION PLANS ─────────────────────────────────────────────────────
  console.log('Creating subscription plans...');
  const [basicPlan, proPlan, premiumPlan] = await SubscriptionPlan.create([
    {
      name: 'Basic',
      price: 999,
      durationDays: 30,
      features: ['List up to 1 turf', 'Basic analytics', 'Email support'],
      maxTurfs: 1,
      isActive: true,
    },
    {
      name: 'Pro',
      price: 2499,
      durationDays: 30,
      features: ['List up to 5 turfs', 'Advanced analytics', 'Priority support', 'Featured listing'],
      maxTurfs: 5,
      isActive: true,
    },
    {
      name: 'Premium',
      price: 4999,
      durationDays: 30,
      features: ['Unlimited turfs', 'Full analytics dashboard', '24/7 support', 'Top placement', 'Custom branding'],
      maxTurfs: 999,
      isActive: true,
    },
  ]);

  // ── USERS ──────────────────────────────────────────────────────────────────
  console.log('Creating users...');
  const [arshak, karthik, preethi, rohit, divya] = await User.create([
    {
      name: 'Arshak',
      email: 'arshak@example.com',
      phone: '+91 90000 00001',
      password: 'password123',
      role: 'user',
      location: { address: 'Perundurai, Tamil Nadu', lat: 11.2768, lng: 77.5829 },
      favoriteSports: ['Football', 'Cricket'],
    },
    {
      name: 'Karthik Raja',
      email: 'karthik@example.com',
      phone: '+91 90000 00002',
      password: 'password123',
      role: 'user',
      location: { address: 'Anna Nagar, Chennai', lat: 13.0850, lng: 80.2101 },
      favoriteSports: ['Cricket', 'Badminton'],
    },
    {
      name: 'Preethi Nair',
      email: 'preethi@example.com',
      phone: '+91 90000 00003',
      password: 'password123',
      role: 'user',
      location: { address: 'Baner, Pune', lat: 18.5605, lng: 73.7898 },
      favoriteSports: ['Badminton', 'Tennis'],
    },
    {
      name: 'Rohit Mehta',
      email: 'rohit@example.com',
      phone: '+91 90000 00004',
      password: 'password123',
      role: 'user',
      location: { address: 'OMR Road, Chennai', lat: 12.9010, lng: 80.2279 },
      favoriteSports: ['Football'],
    },
    {
      name: 'Divya Krishnan',
      email: 'divya@example.com',
      phone: '+91 90000 00005',
      password: 'password123',
      role: 'user',
      location: { address: 'Erode, Tamil Nadu', lat: 11.341, lng: 77.7172 },
      favoriteSports: ['Cricket', 'Football'],
    },
  ]);

  // ── VENDORS ────────────────────────────────────────────────────────────────
  console.log('Creating vendors...');
  const [vendor1, vendor2, vendor3] = await Vendor.create([
    {
      name: 'Rahul Sharma',
      email: 'vendor1@turf.com',
      phone: '+91 98765 43210',
      password: 'password123',
      businessName: 'Rahul Sports Arena',
      gstNumber: '22AAAAA0000A1Z5',
      isVerified: true,
      status: 'active',
    },
    {
      name: 'Priya Verma',
      email: 'vendor2@turf.com',
      phone: '+91 99887 12345',
      password: 'password123',
      businessName: 'Priya Court Club',
      gstNumber: '22BBBBB0000B1Z5',
      isVerified: true,
      status: 'active',
    },
    {
      name: 'Suresh Kumar',
      email: 'vendor3@turf.com',
      phone: '+91 97712 55678',
      password: 'password123',
      businessName: 'Suresh Sports Hub',
      gstNumber: '22CCCCC0000C1Z5',
      isVerified: true,
      status: 'active',
    },
  ]);

  // ── VENDOR SUBSCRIPTIONS ───────────────────────────────────────────────────
  console.log('Creating vendor subscriptions...');
  await VendorSubscription.create([
    {
      vendor: vendor1._id,
      plan: proPlan._id,
      startDate: daysAgo(15),
      expiryDate: new Date('2027-01-01'),
      amount: proPlan.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      isActive: true,
    },
    {
      vendor: vendor2._id,
      plan: basicPlan._id,
      startDate: daysAgo(10),
      expiryDate: new Date('2027-01-01'),
      amount: basicPlan.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      isActive: true,
    },
    {
      vendor: vendor3._id,
      plan: premiumPlan._id,
      startDate: daysAgo(5),
      expiryDate: new Date('2027-06-01'),
      amount: premiumPlan.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      isActive: true,
    },
  ]);

  // ── TURFS ──────────────────────────────────────────────────────────────────
  console.log('Creating turfs...');
  const [turf1, turf2, turf3, turf4, turf5] = await Turf.create([
    {
      name: 'Qube Sportz Arena',
      vendor: vendor1._id,
      sports: ['Football', 'Cricket'],
      images: [
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800',
        'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800',
      ],
      description: 'Premium FIFA-approved turf with floodlights, perfect for evening matches. 7-a-side football and box cricket available.',
      location: {
        address: 'Perundurai Main Road, Perundurai',
        city: 'Perundurai',
        state: 'Tamil Nadu',
        lat: 11.2768,
        lng: 77.5829,
      },
      pricePerHour: 1600,
      amenities: ['Floodlights', 'Parking', 'CCTV', 'Washroom', 'Water', 'Seating'],
      operatingHours: { open: '06:00', close: '23:00' },
      slots: generateSlots(6, 23),
      status: 'active',
      rating: 4.8,
      reviewCount: 42,
      isActive: true,
    },
    {
      name: "Goalie's Turf",
      vendor: vendor1._id,
      sports: ['Football'],
      images: [
        'https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=800',
        'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
      ],
      description: 'Indoor 5-a-side football turf with premium synthetic flooring. Great for evening practise sessions.',
      location: {
        address: 'Erode Main Road',
        city: 'Erode',
        state: 'Tamil Nadu',
        lat: 11.341,
        lng: 77.7172,
      },
      pricePerHour: 1200,
      amenities: ['Floodlights', 'Parking', 'Washroom', 'Water'],
      operatingHours: { open: '06:00', close: '23:00' },
      slots: generateSlots(6, 23),
      status: 'active',
      rating: 4.5,
      reviewCount: 28,
      isActive: true,
    },
    {
      name: 'Baseline Court',
      vendor: vendor2._id,
      sports: ['Badminton', 'Tennis'],
      images: [
        'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
      ],
      description: 'Wooden flooring badminton and tennis courts with AC. 4 courts available simultaneously.',
      location: {
        address: 'Baner Road, Baner',
        city: 'Pune',
        state: 'Maharashtra',
        lat: 18.5605,
        lng: 73.7898,
      },
      pricePerHour: 1800,
      amenities: ['AC', 'CCTV', 'Washroom', 'Water', 'Seating', 'Parking'],
      operatingHours: { open: '06:00', close: '22:00' },
      slots: generateSlots(6, 22),
      status: 'active',
      rating: 4.6,
      reviewCount: 19,
      isActive: true,
    },
    {
      name: 'Champions Cricket Box',
      vendor: vendor2._id,
      sports: ['Cricket'],
      images: [
        'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800',
      ],
      description: 'Box cricket nets with bowling machine and floodlights. Best spot for quick evening matches in Chennai.',
      location: {
        address: 'Anna Nagar West',
        city: 'Chennai',
        state: 'Tamil Nadu',
        lat: 13.0850,
        lng: 80.2101,
      },
      pricePerHour: 1200,
      amenities: ['Floodlights', 'Parking', 'Seating', 'Water', 'CCTV'],
      operatingHours: { open: '06:00', close: '23:00' },
      slots: generateSlots(6, 23),
      status: 'active',
      rating: 4.7,
      reviewCount: 35,
      isActive: true,
    },
    {
      name: 'Thunder Football Zone',
      vendor: vendor3._id,
      sports: ['Football'],
      images: [
        'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
        'https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=800',
      ],
      description: 'Professional 7-a-side football arena with synthetic grass and pro-level floodlights on OMR.',
      location: {
        address: 'OMR Road, Sholinganallur',
        city: 'Chennai',
        state: 'Tamil Nadu',
        lat: 12.9010,
        lng: 80.2279,
      },
      pricePerHour: 1400,
      amenities: ['Floodlights', 'Parking', 'Washroom', 'Water', 'Seating', 'CCTV'],
      operatingHours: { open: '05:00', close: '23:00' },
      slots: generateSlots(5, 23),
      status: 'active',
      rating: 4.3,
      reviewCount: 22,
      isActive: true,
    },
  ]);

  // ── BOOKINGS ───────────────────────────────────────────────────────────────
  console.log('Creating bookings...');
  const [b1, b2, b3, b4, b5, b6] = await Booking.create([
    // Completed bookings (for reviews)
    {
      user: arshak._id,
      turf: turf1._id,
      date: daysAgo(10),
      startTime: '18:00',
      endTime: '19:00',
      duration: 1,
      sport: 'Football',
      totalAmount: 1600,
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      status: 'completed',
      acceptedAt: daysAgo(11),
    },
    {
      user: karthik._id,
      turf: turf4._id,
      date: daysAgo(7),
      startTime: '20:00',
      endTime: '21:00',
      duration: 1,
      sport: 'Cricket',
      totalAmount: 1200,
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      status: 'completed',
      acceptedAt: daysAgo(8),
    },
    {
      user: preethi._id,
      turf: turf3._id,
      date: daysAgo(5),
      startTime: '07:00',
      endTime: '08:00',
      duration: 1,
      sport: 'Badminton',
      totalAmount: 1800,
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      status: 'completed',
      acceptedAt: daysAgo(6),
    },
    {
      user: rohit._id,
      turf: turf5._id,
      date: daysAgo(3),
      startTime: '19:00',
      endTime: '20:00',
      duration: 1,
      sport: 'Football',
      totalAmount: 1400,
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      status: 'completed',
      acceptedAt: daysAgo(4),
    },
    // Upcoming / active bookings
    {
      user: arshak._id,
      turf: turf2._id,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      startTime: '17:00',
      endTime: '18:00',
      duration: 1,
      sport: 'Football',
      totalAmount: 1200,
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      status: 'accepted',
      acceptedAt: new Date(),
    },
    {
      user: divya._id,
      turf: turf1._id,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      startTime: '10:00',
      endTime: '11:00',
      duration: 1,
      sport: 'Cricket',
      totalAmount: 1600,
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      status: 'pending',
    },
  ]);

  // ── REVIEWS ────────────────────────────────────────────────────────────────
  console.log('Creating reviews...');
  await Review.create([
    {
      turf: turf1._id,
      user: arshak._id,
      booking: b1._id,
      rating: 5,
      comment: 'Excellent turf! Floodlights were top-notch and the ground was very well maintained. Will definitely book again.',
    },
    {
      turf: turf4._id,
      user: karthik._id,
      booking: b2._id,
      rating: 4,
      comment: 'Good box cricket setup. The pitch was a bit slippery but overall great experience for the price.',
    },
    {
      turf: turf3._id,
      user: preethi._id,
      booking: b3._id,
      rating: 5,
      comment: 'Amazing AC badminton court. Wooden flooring is perfect. Staff was very helpful too!',
    },
    {
      turf: turf5._id,
      user: rohit._id,
      booking: b4._id,
      rating: 4,
      comment: 'Nice ground on OMR, easy to find parking. Floodlights could be a bit brighter. Good value for money.',
    },
  ]);

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────
  console.log('Creating notifications...');
  await Notification.create([
    {
      user: arshak._id,
      title: 'Booking Confirmed!',
      message: 'Your booking at Qube Sportz Arena on 18:00 has been confirmed. Have a great game!',
      type: 'BookingConfirmed',
      booking: b1._id,
      read: true,
    },
    {
      user: arshak._id,
      title: 'Upcoming Match Reminder',
      message: "Don't forget! You have a booking at Goalie's Turf tomorrow at 17:00.",
      type: 'BookingReminder',
      booking: b5._id,
      read: false,
    },
    {
      user: karthik._id,
      title: 'Booking Confirmed!',
      message: 'Your booking at Champions Cricket Box on 20:00 has been confirmed. Enjoy the game!',
      type: 'BookingConfirmed',
      booking: b2._id,
      read: true,
    },
    {
      user: preethi._id,
      title: 'Booking Confirmed!',
      message: 'Your badminton slot at Baseline Court on 07:00 is confirmed. See you there!',
      type: 'BookingConfirmed',
      booking: b3._id,
      read: false,
    },
    {
      user: divya._id,
      title: 'Booking Pending',
      message: 'Your booking at Qube Sportz Arena is pending vendor approval. We will notify you soon.',
      type: 'General',
      booking: b6._id,
      read: false,
    },
    {
      user: arshak._id,
      title: 'Weekend Offer!',
      message: '20% off on all Football turfs this weekend. Book now and save big!',
      type: 'Promo',
      read: false,
    },
  ]);

  // ── DONE ───────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!');
  console.log('════════════════════════════════════════════════════');
  console.log('👤 USERS');
  console.log('   arshak@example.com   | password123');
  console.log('   karthik@example.com  | password123');
  console.log('   preethi@example.com  | password123');
  console.log('   rohit@example.com    | password123');
  console.log('   divya@example.com    | password123');
  console.log('════════════════════════════════════════════════════');
  console.log('🏪 VENDORS');
  console.log('   vendor1@turf.com  | password123 | Pro Plan');
  console.log('   vendor2@turf.com  | password123 | Basic Plan');
  console.log('   vendor3@turf.com  | password123 | Premium Plan');
  console.log('════════════════════════════════════════════════════');
  console.log('📋 SUBSCRIPTION PLANS: Basic / Pro / Premium');
  console.log('🏟️  TURFS: 5 turfs across Chennai, Erode, Pune');
  console.log('📅 BOOKINGS: 4 completed + 1 accepted + 1 pending');
  console.log('⭐ REVIEWS: 4 reviews');
  console.log('🔔 NOTIFICATIONS: 6 notifications');
  console.log('════════════════════════════════════════════════════\n');
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});   
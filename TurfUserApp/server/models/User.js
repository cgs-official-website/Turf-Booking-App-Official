// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: [true, 'Name is required'], trim: true },
//     email: {
//       type: String,
//       required: [true, 'Email is required'],
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
//     },
//     phone: { type: String, required: [true, 'Phone is required'], trim: true },
//     password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
//     avatar: { type: String, default: '' },
//     role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
//     location: {
//       address: { type: String, default: '' },
//       lat: { type: Number },
//       lng: { type: Number },
//     },
//     wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Turf' }],
//     favoriteSports: [{ type: String }],
//     isActive: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model('User', userSchema);


const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },

    email: {
      type: String,
      unique: true,
      sparse: true,       // allows many docs with no email (phone-only users)
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,       // allows many docs with no phone (google-only users, pre-verify)
      trim: true,
    },

    // Password is now optional — only used by the legacy email/password flow.
    // OTP and Google users never set one.
    password: { type: String, minlength: 6, select: false },

    // Google Sign-In
    googleId: { type: String, unique: true, sparse: true },

    authProvider: { type: String, enum: ['phone', 'google', 'password'], default: 'phone' },

    isPhoneVerified: { type: Boolean, default: false },

    // one-time-password, hashed-free for simplicity (short lived, low value target)
    otp: {
      code:      { type: String, select: false },
      expiresAt: { type: Date, select: false },
    },

    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
    location: {
      address: { type: String, default: '' },
      lat: { type: Number },
      lng: { type: Number },
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Turf' }],
    favoriteSports: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
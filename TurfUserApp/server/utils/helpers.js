const Notification = require('../models/Notification');

// Generates a short unique booking code like 'SIPN089' / '6K6L45L'
const generateBookingCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Adds minutes to a 'HH:mm' string, returns 'HH:mm'
const addMinutesToTime = (time, minutes) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60)
    .toString()
    .padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const createNotification = async ({ user, title, message, type = 'General', booking = null }) => {
  try {
    await Notification.create({ user, title, message, type, booking });
  } catch (err) {
    console.error('Notification create failed:', err.message);
  }
};

module.exports = { generateBookingCode, addMinutesToTime, timeToMinutes, createNotification };
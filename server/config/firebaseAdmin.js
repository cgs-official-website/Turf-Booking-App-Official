const { query } = require('../config/db');

/**
 * Clean mock admin object to satisfy legacy imports safely without Firebase SDK
 */
module.exports = {
  admin: null,
  db: null,
  auth: null,
  storage: null,
  messaging: null,
  query,
};

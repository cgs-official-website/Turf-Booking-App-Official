// Minimal super-admin auth: no separate admin login system exists yet in
// this codebase, so admin endpoints are protected with a shared secret
// (set ADMIN_SECRET in .env) sent as the `x-admin-secret` header.
// Swap this for a real Admin model + JWT login when a super-admin panel is built.
module.exports = function adminAuth(req, res, next) {
  const key = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({ success: false, message: 'ADMIN_SECRET is not configured on the server' });
  }
  if (!key || key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: 'Invalid or missing admin credentials' });
  }
  next();
};
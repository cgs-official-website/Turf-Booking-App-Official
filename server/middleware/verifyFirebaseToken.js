const { auth } = require('../config/firebaseAdmin');
const { sendError } = require('../utils/response');

/**
 * Used strictly for Google Sign-In endpoint to verify client-provided Firebase ID token
 */
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.idToken;

  if (!idToken) {
    return sendError(res, 'Firebase ID token is required', 401, 'FIREBASE_TOKEN_MISSING');
  }

  if (!auth) {
    return sendError(res, 'Firebase Admin Auth is not configured on server', 500, 'FIREBASE_NOT_CONFIGURED');
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.firebaseUser = {
      uid: decoded.uid,
      email: decoded.email,
      phone: decoded.phone_number,
      name: decoded.name,
      picture: decoded.picture,
      admin: decoded.admin || false,
    };
    next();
  } catch (err) {
    console.error('Firebase ID token verification failed:', err.message);
    return sendError(res, 'Invalid or expired Firebase ID token', 401, 'INVALID_FIREBASE_TOKEN');
  }
};

module.exports = verifyFirebaseToken;

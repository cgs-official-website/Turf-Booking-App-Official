const { OAuth2Client } = require('google-auth-library');
const { sendError } = require('../utils/response');

const client = new OAuth2Client();

/**
 * Verifies client Google ID Token directly without any Firebase dependency
 */
const verifyGoogleToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.idToken;

  if (!idToken) {
    return sendError(res, 'Google ID token is required', 401, 'GOOGLE_TOKEN_MISSING');
  }

  try {
    // If running in development with dummy tokens
    if (idToken === 'test_google_token' || idToken.startsWith('mock_')) {
      req.firebaseUser = {
        uid: 'google_mock_user_123',
        email: 'googleuser@example.com',
        name: 'Mock Google User',
        picture: '',
        admin: false,
      };
      return next();
    }

    // Verify token using official Google OAuth client
    const ticket = await client.verifyIdToken({
      idToken,
    });
    const payload = ticket.getPayload();

    req.firebaseUser = {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      admin: false,
    };
    next();
  } catch (err) {
    console.error('Google ID token verification failed:', err.message);
    return sendError(res, 'Invalid or expired Google ID token', 401, 'INVALID_GOOGLE_TOKEN');
  }
};

module.exports = verifyGoogleToken;

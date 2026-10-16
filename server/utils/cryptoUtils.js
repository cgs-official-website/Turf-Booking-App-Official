const crypto = require('crypto');

// Master key derived using SHA-256 to ensure exact 32-byte length
function getMasterKey() {
  const secret = process.env.CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET || 'turf-booking-app-default-encryption-salt-2026';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt a sensitive string using AES-256-GCM
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted string in format "enc:iv:authTag:ciphertext"
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return text;
  // If already encrypted, don't re-encrypt
  if (text.startsWith('enc:')) return text;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string
 * @param {string} encryptedText - Encrypted string in format "enc:iv:authTag:ciphertext"
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!encryptedText.startsWith('enc:')) return encryptedText;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) return encryptedText;

    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const ciphertext = parts[3];

    const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('⚠️ Decryption failed for secret:', err.message);
    return '';
  }
}

/**
 * Safely masks a secret string so it is never exposed in API responses or logs
 * @param {string} secret - Secret string
 * @returns {string} Masked string, e.g. "••••••••" or "••••••••abcd"
 */
function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') return '';
  const clean = secret.startsWith('enc:') ? decrypt(secret) : secret;
  if (!clean || clean.length === 0) return '';
  if (clean.length <= 4) return '••••••••';
  const last4 = clean.slice(-4);
  return `••••••••${last4}`;
}

/**
 * Checks if a string looks like an already-masked placeholder value
 */
function isMasked(value) {
  if (!value || typeof value !== 'string') return false;
  return value.includes('••••') || value.includes('****');
}

module.exports = {
  encrypt,
  decrypt,
  maskSecret,
  isMasked,
};

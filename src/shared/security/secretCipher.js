const crypto = require('crypto');
const env = require('../../config/env');

const VERSION = 'v1';
const IV_LENGTH = 12;

function encryptionKey() {
  return crypto.createHash('sha256').update(env.SETTINGS_ENCRYPTION_KEY).digest();
}

function encryptSecret(value) {
  if (!value) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptSecret(payload) {
  if (!payload) return null;

  const [version, ivValue, tagValue, encryptedValue] = String(payload).split(':');
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Unsupported encrypted secret format');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  decryptSecret,
  encryptSecret,
};

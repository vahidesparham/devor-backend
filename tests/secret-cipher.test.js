const test = require('node:test');
const assert = require('node:assert/strict');

const {
  decryptSecret,
  encryptSecret,
} = require('../src/shared/security/secretCipher');

test('sensitive settings round-trip through authenticated encryption', () => {
  const secret = 'payom-token-value';
  const encrypted = encryptSecret(secret);

  assert.notEqual(encrypted, secret);
  assert.match(encrypted, /^v1:/);
  assert.equal(decryptSecret(encrypted), secret);
});

test('tampered encrypted settings are rejected', () => {
  const encrypted = encryptSecret('payom-token-value');
  const parts = encrypted.split(':');
  parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
  const tampered = parts.join(':');

  assert.throws(() => decryptSecret(tampered));
});

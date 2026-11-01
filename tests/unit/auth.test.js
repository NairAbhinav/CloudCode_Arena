const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { signToken, verifyToken } = require('../../shared/src/utils/auth');

test('Unit Test - Auth: Password hashing and comparison', async () => {
  const password = 'SecretPassword123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  assert.notEqual(password, hash);
  assert.equal(typeof hash, 'string');

  const isMatch = await bcrypt.compare(password, hash);
  assert.equal(isMatch, true, 'Valid password must match hash');

  const isBadMatch = await bcrypt.compare('WrongPassword456!', hash);
  assert.equal(isBadMatch, false, 'Invalid password must not match hash');
});

test('Unit Test - Auth: JWT signing and verification', () => {
  const payload = {
    id: 'user_test_123',
    role: 'student',
    email: 'student@test.com',
    name: 'Test Student'
  };

  const token = signToken(payload);
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 20);

  const decoded = verifyToken(token);
  assert.equal(decoded.id, payload.id);
  assert.equal(decoded.role, payload.role);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.name, payload.name);
});

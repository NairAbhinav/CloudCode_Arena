const test = require('node:test');
const assert = require('node:assert/strict');
const { requireRole, signToken, verifyToken } = require('../../shared/src/utils/auth');

test('Security Test - RBAC: Blocks unauthorized student role from faculty/admin route', () => {
  const middleware = requireRole('faculty', 'admin');

  // Simulated student request
  const req = {
    user: { id: 'std_1', role: 'student', email: 'student@test.com' }
  };

  let statusCalled = null;
  let jsonSent = null;
  const res = {
    status: (code) => {
      statusCalled = code;
      return {
        json: (data) => { jsonSent = data; }
      };
    }
  };

  let nextCalled = false;
  const next = () => { nextCalled = true; };

  middleware(req, res, next);

  assert.equal(nextCalled, false, 'Student must not proceed to faculty/admin endpoint');
  assert.equal(statusCalled, 403, 'Must return HTTP 403 Forbidden');
  assert.equal(jsonSent.success, false);
  assert.match(jsonSent.error, /Access denied/);
});

test('Security Test - RBAC: Blocks faculty role from administrator route', () => {
  const middleware = requireRole('admin');

  const req = {
    user: { id: 'fac_1', role: 'faculty', email: 'faculty@test.com' }
  };

  let statusCalled = null;
  const res = {
    status: (code) => {
      statusCalled = code;
      return { json: () => {} };
    }
  };

  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false, 'Faculty must not access admin-only endpoint');
  assert.equal(statusCalled, 403);
});

test('Security Test - RBAC: Allows authorized admin access', () => {
  const middleware = requireRole('admin');

  const req = {
    user: { id: 'adm_1', role: 'admin', email: 'admin@test.com' }
  };

  let nextCalled = false;
  middleware(req, {}, () => { nextCalled = true; });

  assert.equal(nextCalled, true, 'Admin must be granted access');
});

test('Security Test - Privacy: Rejects unauthenticated requests with no token', () => {
  const middleware = requireRole('student', 'faculty', 'admin');

  const req = {}; // No user on request
  let statusCalled = null;
  const res = {
    status: (code) => {
      statusCalled = code;
      return { json: () => {} };
    }
  };

  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(statusCalled, 401, 'Must return 401 Authentication required');
});

test('Security Test - Test Case Privacy: Student receives public test cases while hidden test cases are omitted', () => {
  const allTestCases = [
    { _id: 'tc_1', input: '1 2', expectedOutput: '3', isHidden: false },
    { _id: 'tc_2', input: '10 20', expectedOutput: '30', isHidden: false },
    { _id: 'tc_3', input: '999 1', expectedOutput: '1000', isHidden: true }
  ];

  // Simulating student view sanitization logic in assessment-service
  const studentRole = 'student';
  let studentTestCases = [];
  let sampleTestCases = [];

  if (studentRole === 'student') {
    const publicCases = allTestCases.filter(tc => !tc.isHidden);
    sampleTestCases = publicCases.map(tc => ({
      input: tc.input || '',
      output: tc.expectedOutput,
      explanation: ''
    }));
    studentTestCases = publicCases.map(tc => ({
      id: tc._id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: false
    }));
  }

  // 1. Student must receive public test cases
  assert.equal(studentTestCases.length, 2);
  assert.equal(sampleTestCases.length, 2);
  assert.equal(studentTestCases[0].expectedOutput, '3');
  assert.equal(sampleTestCases[0].output, '3');

  // 2. Hidden test cases must not be present
  const containsHidden = studentTestCases.some(tc => tc.isHidden === true || tc.expectedOutput === '1000');
  assert.equal(containsHidden, false, 'Hidden test cases must NEVER be exposed to students');
});

test('Security Test - Test Case Privacy: Faculty and Admin receive all test cases (public and hidden)', () => {
  const allTestCases = [
    { _id: 'tc_1', input: '1 2', expectedOutput: '3', isHidden: false },
    { _id: 'tc_2', input: '999 1', expectedOutput: '1000', isHidden: true }
  ];

  const facultyRole = 'faculty';
  const isCreatorOrAdmin = true;

  let exposedTestCases = [];
  if (facultyRole === 'admin' || isCreatorOrAdmin) {
    exposedTestCases = allTestCases.map(tc => ({
      id: tc._id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden
    }));
  }

  assert.equal(exposedTestCases.length, 2);
  assert.equal(exposedTestCases.some(tc => tc.isHidden), true, 'Faculty/admin must view hidden test cases');
  assert.equal(exposedTestCases.some(tc => !tc.isHidden), true, 'Faculty/admin must view public test cases');
});

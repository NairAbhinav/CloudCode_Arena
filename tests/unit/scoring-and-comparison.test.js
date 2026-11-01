const test = require('node:test');
const assert = require('node:assert/strict');

function normalizeOutput(output) {
  if (output === null || output === undefined) return '';
  return String(output)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

function calculateScore(totalTestCases, passedCount, maxMarks) {
  if (totalTestCases === 0) return 0;
  return Math.round((passedCount / totalTestCases) * maxMarks);
}

test('Unit Test - Output Comparison: Handles Windows and Unix newlines identically', () => {
  const unixOutput = '1\n2\n3';
  const windowsOutput = '1\r\n2\r\n3\r\n';
  const withTrailingSpaces = '1  \n2\t\n3 \n\n';

  assert.equal(
    normalizeOutput(unixOutput),
    normalizeOutput(windowsOutput)
  );

  assert.equal(
    normalizeOutput(unixOutput),
    normalizeOutput(withTrailingSpaces)
  );
});

test('Unit Test - Output Comparison: Distinguishes incorrect answers accurately', () => {
  const actual = '8';
  const expectedWrong = '9';
  const expectedRight = '8\n';

  assert.notEqual(normalizeOutput(actual), normalizeOutput(expectedWrong));
  assert.equal(normalizeOutput(actual), normalizeOutput(expectedRight));
});

test('Unit Test - Score Calculation: Correctly computes proportional marks', () => {
  assert.equal(calculateScore(5, 5, 100), 100);
  assert.equal(calculateScore(5, 0, 100), 0);
  assert.equal(calculateScore(4, 2, 50), 25);
  assert.equal(calculateScore(3, 1, 30), 10);
});

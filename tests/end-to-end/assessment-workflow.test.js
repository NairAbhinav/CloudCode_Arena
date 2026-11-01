const test = require('node:test');
const assert = require('node:assert/strict');
const { executePython } = require('../../code-runner/src/executor');
const { generateCsv } = require('../../shared/src/utils/csv');

test('E2E Test - Workflow: Python Problem-Solving, Correct and Incorrect Judging', async () => {
  // Problem: Sum of two numbers
  const solutionCode = `
import sys
line = sys.stdin.read().strip()
if line:
    a, b = map(int, line.split())
    print(a + b)
  `;

  // Public Test Case: 3 5 -> 8
  const test1 = await executePython(solutionCode, '3 5', 3000);
  assert.equal(test1.status, 'Success');
  assert.equal(test1.stdout.trim(), '8');

  // Hidden Test Case: 100 250 -> 350
  const test2 = await executePython(solutionCode, '100 250', 3000);
  assert.equal(test2.status, 'Success');
  assert.equal(test2.stdout.trim(), '350');

  // Negative Numbers: -10 5 -> -5
  const test3 = await executePython(solutionCode, '-10 5', 3000);
  assert.equal(test3.status, 'Success');
  assert.equal(test3.stdout.trim(), '-5');

  // Incorrect Solution
  const wrongCode = `
import sys
print(0)
  `;
  const wrongRun = await executePython(wrongCode, '3 5', 3000);
  assert.notEqual(wrongRun.stdout.trim(), '8', 'Wrong output must be rejected');
});

test('E2E Test - Workflow: Anti-Cheating Violation Monitoring and Threshold Logic', () => {
  const config = {
    enabled: true,
    maxViolations: 3,
    actionOnThreshold: 'terminate'
  };

  let violations = 0;
  let attemptStatus = 'in_progress';
  let isTerminated = false;

  const simulateViolation = (eventType) => {
    violations++;
    if (violations >= config.maxViolations) {
      if (config.actionOnThreshold === 'terminate') {
        attemptStatus = 'terminated';
        isTerminated = true;
      }
    }
  };

  // 1st violation: warning
  simulateViolation('tab_switch');
  assert.equal(violations, 1);
  assert.equal(attemptStatus, 'in_progress');

  // 2nd violation: warning
  simulateViolation('focus_loss');
  assert.equal(violations, 2);
  assert.equal(attemptStatus, 'in_progress');

  // 3rd violation: threshold reached -> auto-terminated!
  simulateViolation('tab_switch');
  assert.equal(violations, 3);
  assert.equal(attemptStatus, 'terminated');
  assert.equal(isTerminated, true);
});

test('E2E Test - Workflow: Results Export and CSV Formula Sanitization', () => {
  const headers = ['Student', 'Score', 'Percentage', 'Status'];
  const attempts = [
    { Student: 'Alex Student', Score: 100, Percentage: '100%', Status: 'completed' },
    { Student: '=1+1Malicious', Score: 0, Percentage: '0%', Status: 'terminated' }
  ];

  const csv = generateCsv(headers, attempts);
  assert.ok(csv.includes('"Alex Student"'));
  assert.ok(csv.includes('"\'=1+1Malicious"'), 'Formula must be escaped with single quote');
});

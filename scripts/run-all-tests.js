const { spawnSync } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('        CLOUDCODE ARENA - AUTOMATED TEST SUITE EXECUTION        ');
console.log('================================================================\n');

const testSuites = [
  { name: 'Unit Tests (Auth, Scoring, CSV, Code Runner)', glob: 'tests/unit/*.test.js' },
  { name: 'Security Tests (RBAC, Privacy, Role Isolation)', glob: 'tests/security/*.test.js' },
  { name: 'Integration Tests (API Gateway & Microservices)', glob: 'tests/integration/*.test.js' },
  { name: 'End-to-End Tests (Assessment Workflow & Judging)', glob: 'tests/end-to-end/*.test.js' }
];

let totalPassed = 0;
let totalFailed = 0;

testSuites.forEach((suite) => {
  console.log(`\n--- Running ${suite.name} ---`);
  const result = spawnSync('node', ['--test', suite.glob], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  if (result.status === 0) {
    console.log(`[PASS] ${suite.name}`);
    totalPassed++;
  } else {
    console.error(`[FAIL] ${suite.name}`);
    totalFailed++;
  }
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${totalPassed} suites passed, ${totalFailed} suites failed.`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

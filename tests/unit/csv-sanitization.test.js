const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeCsvCell, generateCsv } = require('../../shared/src/utils/csv');

test('Unit Test - CSV Sanitization: Neutralizes formula injection payloads', () => {
  // Common formula injection vectors
  const equalsFormula = '=SUM(A1:A10)';
  const plusFormula = '+cmd|"/c calc"!A0';
  const minusFormula = '-2+3+cmd|"/c calc"!A0';
  const atFormula = '@SUM(1+1)';
  const tabFormula = '\t=1+1';

  assert.equal(sanitizeCsvCell(equalsFormula), `"'=SUM(A1:A10)"`);
  assert.equal(sanitizeCsvCell(plusFormula), ` "'+cmd|""/c calc""!A0"`.trim());
  assert.equal(sanitizeCsvCell(minusFormula), ` "'-2+3+cmd|""/c calc""!A0"`.trim());
  assert.equal(sanitizeCsvCell(atFormula), `"'@SUM(1+1)"`);
  assert.equal(sanitizeCsvCell(tabFormula), `"'\t=1+1"`);
});

test('Unit Test - CSV Sanitization: Preserves standard text and numbers safely', () => {
  assert.equal(sanitizeCsvCell('Alice Smith'), '"Alice Smith"');
  assert.equal(sanitizeCsvCell(100), '"100"');
  assert.equal(sanitizeCsvCell(null), '""');
  assert.equal(sanitizeCsvCell(undefined), '""');
});

test('Unit Test - CSV Generation: Generates RFC-compliant multi-row CSV text', () => {
  const headers = ['Name', 'Score', 'Payload'];
  const rows = [
    { Name: 'Student 1', Score: 95, Payload: '=1+1' },
    { Name: 'Student 2', Score: 80, Payload: 'Safe' }
  ];

  const csv = generateCsv(headers, rows);
  assert.ok(csv.includes('"Name","Score","Payload"'));
  assert.ok(csv.includes('"Student 1","95","\'=1+1"'));
  assert.ok(csv.includes('"Student 2","80","Safe"'));
});

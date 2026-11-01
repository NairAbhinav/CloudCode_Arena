const test = require('node:test');
const assert = require('node:assert/strict');
const { executePython, validatePythonSyntax } = require('../../code-runner/src/executor');

test('Unit Test - Code Runner: Accurately identifies Python syntax errors as SyntaxError', async () => {
  const invalidCode = 'def broken_function(\n    print("Missing closing parenthesis"';
  const syntaxErr = validatePythonSyntax(invalidCode);

  assert.ok(syntaxErr !== null, 'Syntax checker must identify invalid syntax');
  assert.match(syntaxErr, /SyntaxError/, 'Must report SyntaxError accurately');

  const execResult = await executePython(invalidCode);
  assert.equal(execResult.status, 'Runtime Error');
  assert.equal(execResult.errorType, 'SyntaxError');
  assert.match(execResult.stderr, /SyntaxError/);
});

test('Unit Test - Code Runner: Correctly executes Python code with stdin and produces stdout', async () => {
  const validCode = `
import sys
line = sys.stdin.read().strip()
a, b = map(int, line.split())
print(a + b)
  `;

  const result = await executePython(validCode, '14 28', 5000);
  assert.equal(result.status, 'Success');
  assert.equal(result.stdout, '42');
  assert.equal(result.stderr, '');
  assert.ok(result.executionTimeMs >= 0);
});

test('Unit Test - Code Runner: Handles runtime exceptions accurately', async () => {
  const runtimeErrorCode = `
def divide():
    return 10 / 0
divide()
  `;

  const result = await executePython(runtimeErrorCode, '', 5000);
  assert.equal(result.status, 'Runtime Error');
  assert.match(result.stderr, /ZeroDivisionError/);
});

test('Unit Test - Code Runner: Enforces execution timeout on infinite loops', async () => {
  const infiniteLoopCode = `
while True:
    pass
  `;

  const result = await executePython(infiniteLoopCode, '', 1000);
  assert.equal(result.status, 'Time Limit Exceeded');
  assert.equal(result.errorType, 'Timeout');
});

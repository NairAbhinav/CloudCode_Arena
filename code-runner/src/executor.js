const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.CODE_EXEC_TIMEOUT_MS || '5000', 10);
const MAX_OUTPUT_SIZE_BYTES = parseInt(process.env.MAX_OUTPUT_SIZE_BYTES || '65536', 10);
const MAX_CODE_SIZE_BYTES = parseInt(process.env.MAX_CODE_SIZE_BYTES || '65536', 10);

/**
 * Determine the available Python executable name ('python' or 'python3')
 */
let pythonCmd = 'python3';
try {
  const version = execSync(`${pythonCmd} --version`, { stdio: 'pipe' }).toString();
  console.log(`[Code Runner] Detected Python: ${version.trim()}`);
} catch (e) {
  try {
    pythonCmd = 'python';
    const version = execSync(`${pythonCmd} --version`, { stdio: 'pipe' }).toString();
    console.log(`[Code Runner] Detected Python: ${version.trim()}`);
  } catch (err) {
    console.warn('[Code Runner] Warning: Neither python nor python3 detected on direct PATH.');
    pythonCmd = 'python3';
  }
}

/**
 * Validates Python syntax
 */
function validatePythonSyntax(code) {
  try {
    execSync(`${pythonCmd} -c "import sys, ast; ast.parse(sys.stdin.read())"`, {
      input: code,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 2000
    });
    return null;
  } catch (err) {
    const errorMessage = err.stderr ? err.stderr.toString() : err.message;
    return errorMessage || 'SyntaxError: Invalid Python 3 syntax';
  }
}

/**
 * Helper to compile code with timeout
 */
function compileCode(cmd, args, cwd, timeoutMs = 7000) {
  return new Promise((resolve) => {
    let stderr = '';
    let stdout = '';
    let isTimedOut = false;

    const proc = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      isTimedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (isTimedOut) {
        return resolve({ success: false, error: 'Compilation timed out.' });
      }
      if (code !== 0) {
        return resolve({ success: false, error: (stderr || stdout || `Compilation failed with exit code ${code}`).trim() });
      }
      resolve({ success: true });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, error: `Compiler spawn error: ${err.message}` });
    });
  });
}

/**
 * Helper to execute process with inputs, timeout, and output buffering
 */
function runProcess(cmd, args, cwd, input, timeoutMs, env = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isTimedOut = false;
    let isResolved = false;
    const startTime = Date.now();

    const sanitizedEnv = {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      ...env
    };

    const proc = spawn(cmd, args, {
      cwd,
      env: sanitizedEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      isTimedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    if (input !== undefined && input !== null) {
      proc.stdin.write(String(input));
    }
    proc.stdin.end();

    proc.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT_SIZE_BYTES) {
        stdout += chunk.toString();
        if (stdout.length >= MAX_OUTPUT_SIZE_BYTES) {
          stdout += '\n[Output truncated: limit reached]';
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT_SIZE_BYTES) {
        stderr += chunk.toString();
        if (stderr.length >= MAX_OUTPUT_SIZE_BYTES) {
          stderr += '\n[Error output truncated: limit reached]';
        }
      }
    });

    proc.on('close', (exitCode) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timer);
      const executionTimeMs = Date.now() - startTime;

      if (isTimedOut) {
        return resolve({
          status: 'Time Limit Exceeded',
          errorType: 'Timeout',
          stdout: stdout.trim(),
          stderr: `Time Limit Exceeded: Process terminated after ${timeoutMs}ms`,
          executionTimeMs
        });
      }

      if (exitCode !== 0) {
        return resolve({
          status: 'Runtime Error',
          errorType: 'RuntimeError',
          stdout: stdout.trim(),
          stderr: stderr.trim() || `Process exited with error code ${exitCode}`,
          executionTimeMs
        });
      }

      return resolve({
        status: 'Success',
        errorType: null,
        stdout: stdout.trim(),
        stderr: '',
        executionTimeMs
      });
    });

    proc.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timer);
      resolve({
        status: 'Internal Error',
        errorType: 'ProcessSpawnError',
        stdout: '',
        stderr: err.message,
        executionTimeMs: Date.now() - startTime
      });
    });
  });
}

/**
 * Executes source code in supported languages: Python, C, C++, Java, JavaScript
 */
async function executeCode(code, input = '', timeoutMs = DEFAULT_TIMEOUT_MS, language = 'python') {
  if (!code || typeof code !== 'string') {
    return {
      status: 'Runtime Error',
      errorType: 'ValidationError',
      stdout: '',
      stderr: 'No code provided for execution',
      executionTimeMs: 0
    };
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE_BYTES) {
    return {
      status: 'Runtime Error',
      errorType: 'PayloadTooLarge',
      stdout: '',
      stderr: `Code size exceeds maximum limit of ${MAX_CODE_SIZE_BYTES} bytes`,
      executionTimeMs: 0
    };
  }

  const effectiveTimeout = Math.min(Math.max(timeoutMs || DEFAULT_TIMEOUT_MS, 500), 15000);
  const lang = (language || 'python').toLowerCase().trim();

  // Create isolated ephemeral directory for this execution
  const runId = crypto.randomBytes(8).toString('hex');
  const runDir = path.join(os.tmpdir(), `cca_run_${runId}`);
  fs.mkdirSync(runDir, { recursive: true, mode: 0o777 });

  const startTime = Date.now();

  try {
    if (lang === 'python' || lang === 'python3') {
      const syntaxErr = validatePythonSyntax(code);
      if (syntaxErr) {
        return {
          status: 'Runtime Error',
          errorType: 'SyntaxError',
          stdout: '',
          stderr: syntaxErr.trim(),
          executionTimeMs: 0
        };
      }

      const filePath = path.join(runDir, 'solution.py');
      fs.writeFileSync(filePath, code, { encoding: 'utf8', mode: 0o600 });

      return await runProcess(
        pythonCmd,
        ['-u', 'solution.py'],
        runDir,
        input,
        effectiveTimeout,
        { PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1' }
      );
    }

    if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      const filePath = path.join(runDir, 'solution.js');
      fs.writeFileSync(filePath, code, { encoding: 'utf8', mode: 0o600 });

      return await runProcess(
        'node',
        ['solution.js'],
        runDir,
        input,
        effectiveTimeout
      );
    }

    if (lang === 'c') {
      const sourceFile = path.join(runDir, 'solution.c');
      const binFile = path.join(runDir, 'solution');
      fs.writeFileSync(sourceFile, code, { encoding: 'utf8', mode: 0o600 });

      const compRes = await compileCode('gcc', ['-O2', 'solution.c', '-o', 'solution', '-lm'], runDir);
      if (!compRes.success) {
        return {
          status: 'Runtime Error',
          errorType: 'CompilationError',
          stdout: '',
          stderr: compRes.error,
          executionTimeMs: Date.now() - startTime
        };
      }

      return await runProcess(
        binFile,
        [],
        runDir,
        input,
        effectiveTimeout
      );
    }

    if (lang === 'cpp' || lang === 'c++') {
      const sourceFile = path.join(runDir, 'solution.cpp');
      const binFile = path.join(runDir, 'solution');
      fs.writeFileSync(sourceFile, code, { encoding: 'utf8', mode: 0o600 });

      const compRes = await compileCode('g++', ['-O2', '-std=c++17', 'solution.cpp', '-o', 'solution'], runDir);
      if (!compRes.success) {
        return {
          status: 'Runtime Error',
          errorType: 'CompilationError',
          stdout: '',
          stderr: compRes.error,
          executionTimeMs: Date.now() - startTime
        };
      }

      return await runProcess(
        binFile,
        [],
        runDir,
        input,
        effectiveTimeout
      );
    }

    if (lang === 'java') {
      // Detect public or main class name in Java code
      const classMatch = code.match(/(?:public\s+)?class\s+([A-Za-z0-9_]+)/);
      const className = classMatch ? classMatch[1] : 'Solution';

      const sourceFile = path.join(runDir, `${className}.java`);
      fs.writeFileSync(sourceFile, code, { encoding: 'utf8', mode: 0o600 });

      const compRes = await compileCode('javac', [`${className}.java`], runDir);
      if (!compRes.success) {
        return {
          status: 'Runtime Error',
          errorType: 'CompilationError',
          stdout: '',
          stderr: compRes.error,
          executionTimeMs: Date.now() - startTime
        };
      }

      return await runProcess(
        'java',
        ['-Xmx256m', className],
        runDir,
        input,
        effectiveTimeout
      );
    }

    return {
      status: 'Runtime Error',
      errorType: 'UnsupportedLanguage',
      stdout: '',
      stderr: `Unsupported language: '${language}'. Supported languages are: python, c, cpp, java, javascript`,
      executionTimeMs: 0
    };
  } catch (error) {
    return {
      status: 'Internal Error',
      errorType: 'ExecutionException',
      stdout: '',
      stderr: error.message,
      executionTimeMs: Date.now() - startTime
    };
  } finally {
    // Ephemeral cleanup: remove entire run directory
    try {
      if (fs.existsSync(runDir)) {
        fs.rmSync(runDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup error
    }
  }
}

module.exports = {
  executeCode,
  executePython: (code, input, timeoutMs) => executeCode(code, input, timeoutMs, 'python'),
  validatePythonSyntax,
  getPythonCmd: () => pythonCmd
};

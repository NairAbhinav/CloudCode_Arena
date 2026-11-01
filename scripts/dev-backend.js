const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Auth Service', script: 'services/auth-service/src/index.js', port: 5001 },
  { name: 'Assessment Service', script: 'services/assessment-service/src/index.js', port: 5002 },
  { name: 'Submission Service', script: 'services/submission-service/src/index.js', port: 5003 },
  { name: 'Reporting Service', script: 'services/reporting-service/src/index.js', port: 5004 },
  { name: 'Code Runner', script: 'code-runner/src/index.js', port: 5005 },
  { name: 'API Gateway', script: 'api-gateway/src/index.js', port: 5000 }
];

const processes = [];

console.log('[Dev Backend] Launching CloudCode Arena local microservices...');

services.forEach((srv) => {
  const fullPath = path.resolve(__dirname, '..', srv.script);
  const proc = spawn('node', [fullPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: srv.port }
  });

  proc.on('error', (err) => {
    console.error(`[Dev Backend] Failed to start ${srv.name}:`, err);
  });

  proc.on('close', (code) => {
    console.log(`[Dev Backend] ${srv.name} exited with code ${code}`);
  });

  processes.push(proc);
});

process.on('SIGINT', () => {
  console.log('\n[Dev Backend] Shutting down all microservices...');
  processes.forEach(p => p.kill('SIGINT'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  processes.forEach(p => p.kill('SIGTERM'));
  process.exit(0);
});

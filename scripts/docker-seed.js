#!/usr/bin/env node
/**
 * CloudCode Arena - Docker-aware Seed Script
 *
 * This script seeds the database into the correct MongoDB instance:
 * - If Docker container 'cca-auth-service' is running, seeds via the Docker container
 *   so it connects to the internal Docker MongoDB (mongodb://mongodb:27017/...)
 * - Otherwise falls back to seeding directly (for local dev without Docker)
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function isDockerContainerRunning(containerName) {
  try {
    const result = execSync(`docker inspect -f "{{.State.Running}}" ${containerName} 2>&1`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return result === 'true';
  } catch {
    return false;
  }
}

async function seedViaDocker() {
  console.log('[Docker Seed] Detected Docker environment. Seeding via cca-auth-service container...');

  const seedScriptPath = path.join(__dirname, 'seed.js');
  const containerSeedPath = '/app/services/auth-service/seed.js';

  // Copy the seed script into the container
  try {
    execSync(`docker cp "${seedScriptPath}" cca-auth-service:${containerSeedPath}`, {
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('[Docker Seed] Failed to copy seed script:', err.message);
    process.exit(1);
  }

  // Run the seed inside the container with the Docker-internal MongoDB URI
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-w', '/app/services/auth-service',
      '-e', 'MONGO_URI=mongodb://mongodb:27017/cloudcode_arena',
      'cca-auth-service',
      'node', 'seed.js'
    ],
    {
      stdio: 'inherit',
      encoding: 'utf8'
    }
  );

  if (result.status !== 0) {
    console.error('[Docker Seed] Seeding failed inside Docker container.');
    process.exit(result.status || 1);
  }

  console.log('[Docker Seed] Seeding completed successfully via Docker!');
}

function seedLocally() {
  console.log('[Local Seed] No Docker containers detected. Running seed locally...');
  const seedScript = path.join(__dirname, 'seed.js');
  
  // Load .env
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require(seedScript);
}

// Main entry point
(async () => {
  if (isDockerContainerRunning('cca-auth-service')) {
    await seedViaDocker();
  } else {
    seedLocally();
  }
})();

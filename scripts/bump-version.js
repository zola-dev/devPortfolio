#!/usr/bin/env node

/**
 * bump-version.js
 * Increments patch version in package.json before each build.
 * Rollover: 0.0.99 → 0.1.0, 0.99.99 → 1.0.0
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function bumpVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: "${version}". Expected X.Y.Z`);
  }

  let [major, minor, patch] = parts;

  patch += 1;

  if (patch >= 100) {
    patch = 0;
    minor += 1;
  }

  if (minor >= 100) {
    minor = 0;
    major += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function main() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    log('package.json not found!', 'red');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const oldVersion = packageJson.version || '0.0.0';
  const newVersion = bumpVersion(oldVersion);

  packageJson.version = newVersion;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

  log('', 'reset');
  log('Version Bumped', 'cyan');
  log('═══════════════════════════════════════', 'cyan');
  log(`   ${colors.yellow}${oldVersion}${colors.reset}  →  ${colors.bright}${colors.green}${newVersion}${colors.reset}`);
  log('═══════════════════════════════════════', 'cyan');
  log('', 'reset');
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error('Error bumping version:', error.message);
  process.exit(1);
}
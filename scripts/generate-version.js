#!/usr/bin/env node

/**
 * Generate version.json with Git commit information
 * Ova skripta se pokreće pre build-a da generiše version.json fajl
 * sa informacijama iz package.json i Git-a
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Boje za konzolu
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execGitCommand(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.warn(`Warning: Git command failed: ${command}`);
    return null;
  }
}

function getGitInfo() {
  const hash = execGitCommand('git rev-parse HEAD');
  const shortHash = execGitCommand('git rev-parse --short HEAD');
  const message = execGitCommand('git log -1 --pretty=%B');
  const author = execGitCommand('git log -1 --pretty=%an');
  const authorEmail = execGitCommand('git log -1 --pretty=%ae');
  const date = execGitCommand('git log -1 --pretty=%cI');
  const branch = execGitCommand('git rev-parse --abbrev-ref HEAD');
  const tag = execGitCommand('git describe --tags --abbrev=0 2>/dev/null');

  return {
    hash,
    shortHash,
    message,
    author,
    authorEmail,
    date,
    branch,
    tag
  };
}

function generateVersionJson() {
  log('\n🚀 Generating version.json...', 'cyan');
  log('═══════════════════════════════════════', 'cyan');

  // Učitaj package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // Dobavi Git informacije
  log('📦 Reading Git information...', 'blue');
  const gitInfo = getGitInfo();

  // Proveri da li je production build
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.argv.includes('--production');

  // Kreiraj version objekat
  const versionInfo = {
    version: packageJson.version || '1.0.0',
    buildDate: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development'
  };

  // Dodaj Git informacije ako su dostupne
  if (gitInfo.hash) {
    versionInfo.commit = {
      hash: gitInfo.hash,
      shortHash: gitInfo.shortHash,
      message: gitInfo.message,
      author: gitInfo.author,
      email: gitInfo.authorEmail,
      date: gitInfo.date,
      branch: gitInfo.branch,
      tag: gitInfo.tag || null
    };
  }

  // Kreiraj assets folder ako ne postoji
  const assetsPath = path.join(process.cwd(), 'src', 'assets');
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
    log('📁 Created assets directory', 'yellow');
  }

  // Sačuvaj version.json
  const versionFilePath = path.join(assetsPath, 'version.json');
  fs.writeFileSync(
    versionFilePath,
    JSON.stringify(versionInfo, null, 2),
    'utf-8'
  );

  // Ispis informacija
  log('\n✅ version.json generated successfully!', 'green');
  log('═══════════════════════════════════════', 'cyan');
  log(`📍 Location: ${versionFilePath}`, 'blue');
  log(`📌 Version: ${colors.bright}${versionInfo.version}${colors.reset}`, 'reset');
  log(`🌍 Environment: ${colors.bright}${versionInfo.environment}${colors.reset}`, 'reset');
  
  if (versionInfo.commit) {
    log('\n📝 Commit Information:', 'magenta');
    log(`   Hash: ${versionInfo.commit.shortHash}`, 'reset');
    log(`   Branch: ${versionInfo.commit.branch}`, 'reset');
    log(`   Author: ${versionInfo.commit.author}`, 'reset');
    log(`   Message: "${versionInfo.commit.message}"`, 'reset');
    log(`   Date: ${new Date(versionInfo.commit.date).toLocaleString('sr-RS')}`, 'reset');
    if (versionInfo.commit.tag) {
      log(`   Tag: ${versionInfo.commit.tag}`, 'reset');
    }
  }
  
  log('═══════════════════════════════════════\n', 'cyan');

  return versionInfo;
}

// Pokreni generisanje
try {
  generateVersionJson();
  process.exit(0);
} catch (error) {
  console.error('❌ Error generating version.json:', error);
  process.exit(1);
}s
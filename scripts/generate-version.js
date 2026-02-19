#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  const branch = execGitCommand('git rev-parse --abbrev-ref HEAD');
  
  const message = execGitCommand('git log -1 --pretty=%s');
  const body = execGitCommand('git log -1 --pretty=%b');
  const author = execGitCommand('git log -1 --pretty=%an');
  const authorEmail = execGitCommand('git log -1 --pretty=%ae');
  const date = execGitCommand('git log -1 --pretty=%cI');
  
  const tag = execGitCommand('git describe --tags --abbrev=0 2>/dev/null');
  const totalCommits = execGitCommand('git rev-list --count HEAD');
  
  const changedFiles = execGitCommand('git diff-tree --no-commit-id -r --name-only HEAD');
  const stats = execGitCommand('git diff-tree --no-commit-id -r --shortstat HEAD');
  
  let coAuthors = [];
  if (body) {
    const matches = body.match(/Co-authored-by: (.+) <(.+)>/g);
    if (matches) {
      coAuthors = matches.map(ca => {
        const match = ca.match(/Co-authored-by: (.+) <(.+)>/);
        return match ? { name: match[1], email: match[2] } : null;
      }).filter(Boolean);
    }
  }

  return {
    hash,
    shortHash,
    branch,
    message,
    body: body || null,
    author,
    authorEmail,
    date,
    tag: tag || null,
    totalCommits: parseInt(totalCommits) || 0,
    changedFiles: changedFiles ? changedFiles.split('\n').filter(Boolean) : [],
    stats: stats || null,
    coAuthors
  };
}

function getCommitHistory(count = 10) {
  // Koristimo jedinstveni separator koji neće biti u commit porukama
  const COMMIT_SEP = '---COMMIT_SEP---';
  const FIELD_SEP = '---FIELD_SEP---';

  // %s = subject (prva linija), %b = body, %an = author name, %ae = email, %cI = date
  // Ne mešamo body sa ostalim poljima - koristimo poseban format
  const format = `%H${FIELD_SEP}%h${FIELD_SEP}%s${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%cI${FIELD_SEP}%b${COMMIT_SEP}`;

  const raw = execGitCommand(
    `git log -${count} --pretty=format:"${format}"`
  );

  if (!raw) return [];

  // Split po commit separatoru
  const commits = raw
    .split(COMMIT_SEP)
    .map(s => s.trim())
    .filter(Boolean);

  return commits.map(commitRaw => {
    const [hash, shortHash, subject, author, email, date, ...bodyParts] = commitRaw.split(FIELD_SEP);

    // Body je sve što ostane nakon 6 polja
    const body = bodyParts.join(FIELD_SEP).trim() || null;

    if (!hash || !shortHash) return null;

    // Stats i changed files po commitu - koristimo diff-tree (brže od git show)
    const statsRaw = execGitCommand(
      `git diff-tree --no-commit-id -r --shortstat ${hash}`
    );
    const filesRaw = execGitCommand(
      `git diff-tree --no-commit-id -r --name-only ${hash}`
    );

    return {
      hash: hash.trim(),
      shortHash: shortHash.trim(),
      message: subject ? subject.trim() : null,
      body: body || null,
      author: author ? author.trim() : null,
      email: email ? email.trim() : null,
      date: date ? date.trim() : null,
      stats: statsRaw ? statsRaw.trim() : null,
      changedFiles: filesRaw ? filesRaw.split('\n').filter(Boolean) : []
    };
  }).filter(Boolean);
}

function generateVersionJson() {
  log('\n🚀 Generating version.json...', 'cyan');
  log('═══════════════════════════════════════', 'cyan');

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  log('📦 Reading Git information...', 'blue');
  const gitInfo = getGitInfo();

  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.argv.includes('--production');

  const versionInfo = {
    version: packageJson.version || '1.0.0',
    buildDate: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    commit: null,
    history: getCommitHistory(10)
  };

  if (gitInfo.hash) {
    versionInfo.commit = {
      hash: gitInfo.hash,
      shortHash: gitInfo.shortHash,
      message: gitInfo.message,
      body: gitInfo.body,
      author: gitInfo.author,
      email: gitInfo.authorEmail,
      date: gitInfo.date,
      branch: gitInfo.branch,
      tag: gitInfo.tag,
      totalCommits: gitInfo.totalCommits,
      changedFiles: gitInfo.changedFiles,
      stats: gitInfo.stats,
      coAuthors: gitInfo.coAuthors
    };
  }

  const outputPath = path.join(process.cwd(), 'public');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    log('📁 Created public directory', 'yellow');
  }

  const versionFilePath = path.join(outputPath, 'version.json');
  fs.writeFileSync(
    versionFilePath,
    JSON.stringify(versionInfo, null, 2),
    'utf-8'
  );

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
    log(`   Date: ${new Date(versionInfo.commit.date).toLocaleString('en-US')}`, 'reset');
    if (versionInfo.commit.tag) {
      log(`   Tag: ${versionInfo.commit.tag}`, 'reset');
    }
    if (versionInfo.commit.totalCommits) {
      log(`   Total Commits: ${versionInfo.commit.totalCommits}`, 'reset');
    }
    if (versionInfo.commit.stats) {
      log(`   Stats: ${versionInfo.commit.stats}`, 'reset');
    }
    if (versionInfo.commit.changedFiles.length > 0) {
      log(`   Changed Files: ${versionInfo.commit.changedFiles.length}`, 'reset');
    }
    if (versionInfo.commit.coAuthors.length > 0) {
      log(`   Co-Authors: ${versionInfo.commit.coAuthors.length}`, 'reset');
    }
  }
  
  log('═══════════════════════════════════════\n', 'cyan');

  return versionInfo;
}

try {
  generateVersionJson();
  process.exit(0);
} catch (error) {
  console.error('❌ Error generating version.json:', error);
  process.exit(1);
}
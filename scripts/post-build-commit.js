#!/usr/bin/env node

/**
 * postbuild.js
 * After a successful build:
 *  1. Shows git status + diff summary
 *  2. Stages all changes
 *  3. Prompts for commit message and optional tags
 *  4. Commits locally
 *  5. Asks whether to push to remote origin (current branch)
 */

const { execSync, spawnSync } = require('child_process');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

function c(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, silent = false) {
  try {
    const result = execSync(command, { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    if (!silent) {
      log(`⚠️  Command failed: ${command}`, 'yellow');
      if (error.stderr) console.error(error.stderr);
    }
    return null;
  }
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function showGitStatus() {
  log('\n📋 Git Status', 'cyan');
  log('═══════════════════════════════════════', 'cyan');

  const status = exec('git status --short');
  if (!status) {
    log('  (no changes)', 'dim');
  } else {
    status.split('\n').forEach(line => {
      const flag = line.slice(0, 2).trim();
      const file = line.slice(3);
      let color = 'reset';
      if (flag === 'M' || flag === 'MM') color = 'yellow';
      else if (flag === 'A') color = 'green';
      else if (flag === 'D') color = 'red';
      else if (flag === '??' ) color = 'dim';
      console.log(`  ${c(line.slice(0, 2), color)} ${file}`);
    });
  }

  const stat = exec('git diff --stat HEAD', true);
  if (stat) {
    log('\n📊 Diff Summary (vs HEAD)', 'blue');
    stat.split('\n').forEach(line => console.log(`  ${c(line, 'dim')}`));
  }

  log('═══════════════════════════════════════\n', 'cyan');
}

function getCurrentBranch() {
  return exec('git rev-parse --abbrev-ref HEAD') || 'main';
}

function hasRemote() {
  const remotes = exec('git remote', true);
  return remotes && remotes.includes('origin');
}

function hasChanges() {
  const status = exec('git status --porcelain', true);
  return status && status.length > 0;
}

async function main() {
  log('\n🚀 Post-Build: Commit & Deploy', 'magenta');
  log('═══════════════════════════════════════', 'magenta');

  if (!hasChanges()) {
    log('\n✅ Nothing to commit — working tree clean.\n', 'green');
    process.exit(0);
  }

  showGitStatus();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  //Commit message
  let commitMessage = '';
  while (!commitMessage.trim()) {
    commitMessage = await ask(rl, c('📝 Commit message: ', 'bright'));
    if (!commitMessage.trim()) {
      log('   ⚠️  Message cannot be empty.', 'yellow');
    }
  }

  //Optional tags
  const tagsInput = await ask(rl, c('🏷️  Tags (optional, space-separated, e.g. v1.0.0 release): ', 'bright'));
  const tags = tagsInput.trim()
    ? tagsInput.trim().split(/\s+/).filter(Boolean)
    : [];

  //Confirm
  const branch = getCurrentBranch();
  log(`\n   Branch : ${c(branch, 'cyan')}`, 'reset');
  log(`   Message: ${c(commitMessage.trim(), 'green')}`, 'reset');
  if (tags.length > 0) {
    log(`   Tags   : ${c(tags.join(', '), 'yellow')}`, 'reset');
  }

  const confirm = await ask(rl, c('\n✅ Proceed with commit? (y/n): ', 'bright'));
  if (confirm.trim().toLowerCase() !== 'y') {
    log('\n❌ Commit cancelled.\n', 'red');
    rl.close();
    process.exit(0);
  }

  //Stage all
  log('\n📦 Staging all changes...', 'blue');
  const stageResult = exec('git add -A');
  if (stageResult === null) {
    log('❌ Failed to stage changes.', 'red');
    rl.close();
    process.exit(1);
  }

  //Commit
  log('💾 Committing...', 'blue');
  const message = commitMessage.trim().replace(/"/g, '\\"');
  const commitResult = exec(`git commit -m "${message}"`);
  if (commitResult === null) {
    log('❌ Commit failed.', 'red');
    rl.close();
    process.exit(1);
  }

  const shortHash = exec('git rev-parse --short HEAD') || '';
  log(`\n✅ Committed locally! ${c(shortHash, 'yellow')}`, 'green');

  //Tags
  if (tags.length > 0) {
    log('\n🏷️  Creating tags...', 'blue');
    for (const tag of tags) {
      const tagResult = exec(`git tag ${tag}`);
      if (tagResult === null) {
        log(`   ⚠️  Could not create tag "${tag}" (may already exist)`, 'yellow');
      } else {
        log(`   ✅ Tagged: ${c(tag, 'cyan')}`, 'green');
      }
    }
  }

  //Push
  if (!hasRemote()) {
    log('\nℹ️  No remote "origin" found — skipping push.\n', 'dim');
    rl.close();
    process.exit(0);
  }

  const pushAnswer = await ask(rl, c(`\n🌐 Push to origin/${branch}? (y/n): `, 'bright'));

  if (pushAnswer.trim().toLowerCase() === 'y') {
    log(`\n📡 Pushing to origin/${branch}...`, 'blue');

    //Push branch
    const pushResult = exec(`git push origin ${branch}`);
    if (pushResult === null) {
      log('❌ Push failed. Check your remote and try manually: git push origin ' + branch, 'red');
    } else {
      log(`✅ Pushed to origin/${branch}!`, 'green');
    }

    // Push tags if any
    if (tags.length > 0) {
      log('📡 Pushing tags...', 'blue');
      const tagPush = exec('git push origin --tags');
      if (tagPush === null) {
        log('⚠️  Tag push failed. Try: git push origin --tags', 'yellow');
      } else {
        log('✅ Tags pushed!', 'green');
      }
    }
  } else {
    log(`\nℹ️  Skipped push. Run manually when ready:\n   ${c(`git push origin ${branch}`, 'cyan')}\n`, 'dim');
  }

  log('\n🎉 All done!\n', 'magenta');
  rl.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
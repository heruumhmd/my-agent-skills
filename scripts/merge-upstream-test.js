const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { detectDistributionChanges } = require('./detect-distribution-changes');
const { FORK_OWNED_CONFLICTS, isForkOwnedConflict, mergeUpstream } = require('./merge-upstream');
const { INSTALL_DOCS } = require('./validate-distribution');

function git(repo, ...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

function write(repo, relativePath, contents) {
  const filePath = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function createConflictingRepository(conflictPath) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-upstream-'));
  git(repo, 'init', '-b', 'main');
  git(repo, 'config', 'user.name', 'Merge Upstream Test');
  git(repo, 'config', 'user.email', 'merge-upstream@example.invalid');
  git(repo, 'config', 'core.autocrlf', 'false');

  write(repo, conflictPath, 'base\n');
  write(repo, 'upstream-only.txt', 'base\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'base');
  git(repo, 'branch', 'upstream');

  write(repo, conflictPath, 'fork customization\n');
  git(repo, 'add', conflictPath);
  git(repo, 'commit', '-m', 'customize fork');

  git(repo, 'checkout', 'upstream');
  write(repo, conflictPath, 'upstream customization\n');
  write(repo, 'upstream-only.txt', 'updated upstream\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'update upstream');
  git(repo, 'checkout', 'main');

  return repo;
}

test('resolves allowlisted fork metadata conflicts while retaining clean upstream changes', () => {
  const repo = createConflictingRepository('README.md');

  const result = mergeUpstream(repo, 'upstream');

  assert.deepEqual(result.resolvedConflicts, ['README.md']);
  assert.equal(fs.readFileSync(path.join(repo, 'README.md'), 'utf8'), 'fork customization\n');
  assert.equal(fs.readFileSync(path.join(repo, 'upstream-only.txt'), 'utf8'), 'updated upstream\n');
  assert.equal(git(repo, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length, 3);
});

test('treats every distribution-rewritten installer document as fork-owned', () => {
  const missing = INSTALL_DOCS.filter((file) => !FORK_OWNED_CONFLICTS.has(file));

  assert.deepEqual(missing, []);
});

test('resolves modify/delete conflicts when deleted file is in fork-owned allowlist', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-upstream-del-'));
  git(repo, 'init', '-b', 'main');
  git(repo, 'config', 'user.name', 'Merge Upstream Test');
  git(repo, 'config', 'user.email', 'merge-upstream@example.invalid');
  git(repo, 'config', 'core.autocrlf', 'false');

  const conflictPath = '.github/workflows/test-plugin-install.yml';
  write(repo, conflictPath, 'upstream workflow\n');
  write(repo, 'upstream-only.txt', 'base\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'base');
  git(repo, 'branch', 'upstream');

  git(repo, 'rm', conflictPath);
  git(repo, 'commit', '-m', 'delete in fork');

  git(repo, 'checkout', 'upstream');
  write(repo, conflictPath, 'updated upstream workflow\n');
  write(repo, 'upstream-only.txt', 'updated upstream\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'update upstream');
  git(repo, 'checkout', 'main');

  const result = mergeUpstream(repo, 'upstream');

  assert.deepEqual(result.resolvedConflicts, [conflictPath]);
  assert.equal(fs.existsSync(path.join(repo, conflictPath)), false);
  assert.equal(fs.readFileSync(path.join(repo, 'upstream-only.txt'), 'utf8'), 'updated upstream\n');
  assert.equal(git(repo, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length, 3);
});

test('fails closed and aborts when a conflict is outside the fork-owned allowlist', () => {
  const conflictPath = 'skills/example/SKILL.md';
  const repo = createConflictingRepository(conflictPath);
  const before = git(repo, 'rev-parse', 'HEAD');

  assert.throws(
    () => mergeUpstream(repo, 'upstream'),
    /Refusing to auto-resolve conflicts outside the fork-owned allowlist: skills\/example\/SKILL\.md/,
  );

  assert.equal(git(repo, 'rev-parse', 'HEAD'), before);
  assert.equal(fs.existsSync(path.join(repo, '.git', 'MERGE_HEAD')), false);
  assert.equal(fs.readFileSync(path.join(repo, conflictPath), 'utf8'), 'fork customization\n');
});

test('rejects a dirty working tree without changing repository state', () => {
  const repo = createConflictingRepository('README.md');
  const before = git(repo, 'rev-parse', 'HEAD');
  write(repo, 'local-only.txt', 'uncommitted work\n');

  assert.throws(
    () => mergeUpstream(repo, 'upstream'),
    /Refusing to merge upstream into a dirty working tree/,
  );

  assert.equal(git(repo, 'rev-parse', 'HEAD'), before);
  assert.equal(fs.existsSync(path.join(repo, '.git', 'MERGE_HEAD')), false);
  assert.equal(fs.readFileSync(path.join(repo, 'local-only.txt'), 'utf8'), 'uncommitted work\n');
});

test('weekly sync workflow invokes the guarded upstream merge script', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '.github', 'workflows', 'weekly-upstream-sync.yml'),
    'utf8',
  );

  assert.match(workflow, /node scripts\/merge-upstream\.js upstream\/main/);
  assert.doesNotMatch(workflow, /git merge --no-edit upstream\/main/);
});

test('weekly sync keeps main as the pull request base and uses a separate sync branch', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '.github', 'workflows', 'weekly-upstream-sync.yml'),
    'utf8',
  );

  assert.match(workflow, /fetch-depth: 0\s+ref: main/);
  assert.match(workflow, /branch: automation\/upstream-sync\s+delete-branch: true\s+base: main/);
  assert.doesNotMatch(workflow, /git checkout -B automation\/upstream-sync/);
});

test('detects unchanged and changed distribution trees relative to the base ref', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-distribution-changes-'));
  git(repo, 'init', '-b', 'main');
  git(repo, 'config', 'user.name', 'Distribution Change Test');
  git(repo, 'config', 'user.email', 'distribution-change@example.invalid');
  git(repo, 'config', 'core.autocrlf', 'false');
  write(repo, 'README.md', 'base\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'base');
  git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');

  assert.equal(detectDistributionChanges(repo, 'origin/main'), false);

  write(repo, 'README.md', 'changed\n');
  assert.equal(detectDistributionChanges(repo, 'origin/main'), true);
});

test('fails closed when the distribution base ref cannot be compared', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-distribution-error-'));
  git(repo, 'init', '-b', 'main');

  assert.throws(
    () => detectDistributionChanges(repo, 'missing/base'),
    /Unable to compare the distribution tree with missing\/base/,
  );
});

test('weekly sync gates pull request creation on the distribution detector output', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '.github', 'workflows', 'weekly-upstream-sync.yml'),
    'utf8',
  );

  assert.match(workflow, /id: sync_diff/);
  assert.match(workflow, /node scripts\/detect-distribution-changes\.js origin\/main/);
  assert.match(
    workflow,
    /name: Open sync pull request\s+if: \$\{\{ steps\.sync_diff\.outputs\.has_changes == 'true' \}\}/,
  );
});

test('isForkOwnedConflict recognizes PowerShell scripts, bundles, catalog, automation, workflows, and catalog extension skills', () => {
  const root = path.join(__dirname, '..');
  assert.equal(isForkOwnedConflict('setup-windows-agent.ps1', root), true);
  assert.equal(isForkOwnedConflict('bundles/heru-agent-engineering/bundle.json', root), true);
  assert.equal(isForkOwnedConflict('automation/repos.json', root), true);
  assert.equal(isForkOwnedConflict('catalog/skills.json', root), true);
  assert.equal(isForkOwnedConflict('rules/AGENTS.md', root), true);
  assert.equal(isForkOwnedConflict('AGENTS.md', root), true);
  assert.equal(isForkOwnedConflict('scripts/binary-analyzer-test.js', root), true);
  assert.equal(isForkOwnedConflict('agents/academic-paper-writer.md', root), true);
  assert.equal(isForkOwnedConflict('.github/workflows/ci.yml', root), true);
  assert.equal(isForkOwnedConflict('skills/shadcn-ui-engineering/SKILL.md', root), true);
  assert.equal(isForkOwnedConflict('skills/unknown-skill/SKILL.md', root), false);
  assert.equal(isForkOwnedConflict('skills/code-review-and-quality/SKILL.md', root), false);
});

test('auto-resolves conflicts on fork extension skills while failing on unapproved skills', () => {
  const repo = createConflictingRepository('skills/shadcn-ui-engineering/SKILL.md');
  write(repo, 'catalog/skills.json', JSON.stringify({
    skills: [{ name: 'shadcn-ui-engineering' }]
  }));
  git(repo, 'add', 'catalog/skills.json');
  git(repo, 'commit', '-m', 'add catalog');

  const result = mergeUpstream(repo, 'upstream');
  assert.deepEqual(result.resolvedConflicts, ['skills/shadcn-ui-engineering/SKILL.md']);
  assert.equal(fs.readFileSync(path.join(repo, 'skills/shadcn-ui-engineering/SKILL.md'), 'utf8'), 'fork customization\n');
});

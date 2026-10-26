const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { refreshDistribution } = require('./refresh-distribution');

function write(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

test('refreshes fork counts and install commands after an upstream merge', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-distribution-'));
  for (const skill of ['extension-skill', 'upstream-one', 'upstream-two']) {
    write(root, `skills/${skill}/SKILL.md`, `---\nname: ${skill}\n---\n`);
  }
  write(root, 'catalog/skills.json', `${JSON.stringify({
    total_skills: 2,
    upstream_skills: 1,
    extension_skills: 1,
    skills: [{ name: 'extension-skill' }],
  }, null, 2)}\n`);
  write(root, 'README.md', [
    '## All 2 Skills',
    'npx skills add heruumhmd/my-agent-skills # install all 2 skills',
    '2 upstream lifecycle skills plus 1 extension.',
    '',
  ].join('\n'));
  write(root, 'docs/adoption-guide.md', '[catalog](../README.md#all-2-skills)\n');
  write(root, 'docs/opencode-setup.md', [
    'npx skills add addyosmani/agent-skills --list',
    'Source: https://github.com/addyosmani/agent-skills',
    '',
  ].join('\n'));
  write(root, 'docs/compatibility.md', 'Discovery passed with all 2 skills.\n');
  write(root, '.codex-plugin/plugin.json', '{"description":"Bundles 2 engineering workflows."}\n');

  const result = refreshDistribution(root);
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/skills.json'), 'utf8'));

  assert.equal(result.totalSkills, 3);
  assert.equal(result.upstreamSkills, 2);
  assert.equal(catalog.total_skills, 3);
  assert.equal(catalog.upstream_skills, 2);
  assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /## All 3 Skills/);
  assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /2 upstream lifecycle skills/);
  assert.match(fs.readFileSync(path.join(root, 'docs/adoption-guide.md'), 'utf8'), /#all-3-skills/);
  assert.match(
    fs.readFileSync(path.join(root, 'docs/compatibility.md'), 'utf8'),
    /all 2 skills/,
    'historical compatibility evidence must remain unchanged',
  );
  assert.match(fs.readFileSync(path.join(root, '.codex-plugin/plugin.json'), 'utf8'), /Bundles 3 engineering/);

  const openCode = fs.readFileSync(path.join(root, 'docs/opencode-setup.md'), 'utf8');
  assert.match(openCode, /npx skills add heruumhmd\/my-agent-skills --list/);
  assert.match(openCode, /Source: https:\/\/github\.com\/addyosmani\/agent-skills/);
});

test('rejects extension counts larger than the discovered skill count', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-distribution-'));
  write(root, 'skills/only-skill/SKILL.md', '---\nname: only-skill\n---\n');
  write(root, 'catalog/skills.json', `${JSON.stringify({
    total_skills: 1,
    upstream_skills: 0,
    extension_skills: 2,
    skills: [{ name: 'only-skill' }],
  }, null, 2)}\n`);

  assert.throws(
    () => refreshDistribution(root),
    /Extension skill count exceeds discovered skill count/,
  );
});

test('weekly sync refreshes distribution metadata before quality gates', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '.github', 'workflows', 'weekly-upstream-sync.yml'),
    'utf8',
  );

  const refresh = workflow.indexOf('node scripts/refresh-distribution.js');
  const validation = workflow.indexOf('node scripts/validate-skills.js');
  assert.ok(refresh > -1, 'workflow should refresh downstream metadata');
  assert.ok(validation > refresh, 'metadata refresh should run before validation');
});

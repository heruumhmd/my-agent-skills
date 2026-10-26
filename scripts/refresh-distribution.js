#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { INSTALL_COMMAND, INSTALL_DOCS } = require('./validate-distribution');

function replaceDistributionCounts(text, oldTotal, totalSkills, oldUpstream, upstreamSkills) {
  let result = text;
  if (oldUpstream !== upstreamSkills) {
    const upstreamPattern = new RegExp(`\\b${oldUpstream}\\b(?=\\s+(?:upstream|lifecycle)\\b)`, 'gi');
    result = result.replace(upstreamPattern, upstreamSkills);
  }
  if (oldTotal !== totalSkills) {
    const totalPattern = new RegExp(
      `\\b${oldTotal}\\b(?!\\s+(?:upstream|lifecycle)\\b)(?=[^\\r\\n]{0,120}\\b(?:skills?|workflows)\\b)`,
      'gi',
    );
    const anchorPattern = new RegExp(`(all-)${oldTotal}(?=-skills)`, 'gi');
    result = result
      .replace(totalPattern, totalSkills)
      .replace(anchorPattern, `$1${totalSkills}`);
  }
  return result;
}

function updateFile(filePath, transform, changedFiles) {
  if (!fs.existsSync(filePath)) return;
  const before = fs.readFileSync(filePath, 'utf8');
  const after = transform(before);
  if (after === before) return;
  fs.writeFileSync(filePath, after);
  changedFiles.push(filePath);
}

/**
 * Refresh fork distribution counts and installer references from the current
 * skills directory and catalog metadata.
 *
 * @param {string} rootPath - Distribution repository root path.
 * @returns {{changedFiles: string[], totalSkills: number, upstreamSkills: number}}
 * Relative paths changed and the newly discovered total and upstream counts.
 * @throws {Error} If required files cannot be read, catalog JSON is invalid,
 * filesystem writes fail, or extension skills exceed discovered skills.
 */
function refreshDistribution(rootPath) {
  const root = path.resolve(rootPath);
  const catalogPath = path.join(root, 'catalog', 'skills.json');
  const catalogText = fs.readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(catalogText);
  const oldTotal = catalog.total_skills;
  const oldUpstream = catalog.upstream_skills;
  const totalSkills = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, 'skills', entry.name, 'SKILL.md')))
    .length;
  const upstreamSkills = totalSkills - catalog.extension_skills;
  if (upstreamSkills < 0) throw new Error('Extension skill count exceeds discovered skill count');

  const changedFiles = [];
  updateFile(catalogPath, (text) => text
    .replace(/("total_skills"\s*:\s*)\d+/, `$1${totalSkills}`)
    .replace(/("upstream_skills"\s*:\s*)\d+/, `$1${upstreamSkills}`), changedFiles);

  // docs/compatibility.md is intentionally excluded: it records completed
  // smoke-test evidence and must only change when that verification is rerun.
  const countFiles = [
    path.join(root, 'README.md'),
    path.join(root, '.codex-plugin', 'plugin.json'),
    path.join(root, 'docs', 'adoption-guide.md'),
    path.join(root, 'docs', 'codex-setup.md'),
    path.join(root, 'docs', 'commandcode-setup.md'),
    path.join(root, 'docs', 'comparison.md'),
  ];
  for (const filePath of countFiles) {
    updateFile(filePath, (text) => (
      replaceDistributionCounts(text, oldTotal, totalSkills, oldUpstream, upstreamSkills)
    ), changedFiles);
  }

  for (const relativePath of INSTALL_DOCS) {
    updateFile(path.join(root, relativePath), (text) => text.replace(/^.*$/gm, (line) => (
      INSTALL_COMMAND.test(line)
        ? line.replace(/addyosmani\/agent-skills/ig, 'heruumhmd/my-agent-skills')
        : line
    )), changedFiles);
  }

  return {
    changedFiles: [...new Set(changedFiles)].map((file) => path.relative(root, file).replaceAll('\\', '/')),
    totalSkills,
    upstreamSkills,
  };
}

if (require.main === module) {
  try {
    const result = refreshDistribution(process.argv[2] || path.join(__dirname, '..'));
    console.log(`Distribution metadata refreshed (${result.totalSkills} skills, ${result.upstreamSkills} upstream).`);
    if (result.changedFiles.length) console.log(`Updated: ${result.changedFiles.join(', ')}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { refreshDistribution };

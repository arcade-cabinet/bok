#!/usr/bin/env node
/**
 * Release script for Bok: The Builder's Tome.
 *
 * Usage: node scripts/release.mjs [major|minor|patch]
 *
 * Steps:
 *  1. Determine bump type from CLI arg (default: patch)
 *  2. Read + bump version in package.json
 *  3. Update src/shared/version.ts APP_VERSION
 *  4. Prepend new section in CHANGELOG.md
 *  5. Run typecheck + tests
 *  6. Git commit "release: vX.Y.Z"
 *  7. Git tag vX.Y.Z
 *  8. Print push instructions
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Determine bump type
// ---------------------------------------------------------------------------
const VALID_BUMPS = ['major', 'minor', 'patch'];
const bumpType = process.argv[2] ?? 'patch';

if (!VALID_BUMPS.includes(bumpType)) {
  console.error(`Invalid bump type "${bumpType}". Use: major | minor | patch`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Read current version from package.json
// ---------------------------------------------------------------------------
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;
const parts = currentVersion.split('.').map(Number);

if (parts.length !== 3 || parts.some(Number.isNaN)) {
  console.error(`Invalid current version "${currentVersion}" in package.json`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Bump version
// ---------------------------------------------------------------------------
let [major, minor, patch] = parts;
switch (bumpType) {
  case 'major':
    major += 1;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor += 1;
    patch = 0;
    break;
  case 'patch':
    patch += 1;
    break;
}
const newVersion = `${major}.${minor}.${patch}`;
console.log(`Bumping ${currentVersion} -> ${newVersion} (${bumpType})`);

// ---------------------------------------------------------------------------
// 4. Update package.json
// ---------------------------------------------------------------------------
pkg.version = newVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
console.log(`Updated package.json`);

// ---------------------------------------------------------------------------
// 5. Update src/shared/version.ts
// ---------------------------------------------------------------------------
const versionTsPath = resolve(root, 'src', 'shared', 'version.ts');
const versionTs = readFileSync(versionTsPath, 'utf-8');
const updatedVersionTs = versionTs.replace(
  /export const APP_VERSION = '[^']+';/,
  `export const APP_VERSION = '${newVersion}';`,
);

if (updatedVersionTs === versionTs) {
  console.error('Failed to update APP_VERSION in src/shared/version.ts');
  process.exit(1);
}

writeFileSync(versionTsPath, updatedVersionTs, 'utf-8');
console.log(`Updated src/shared/version.ts`);

// ---------------------------------------------------------------------------
// 6. Prepend new section to CHANGELOG.md
// ---------------------------------------------------------------------------
const changelogPath = resolve(root, 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf-8');
const today = new Date().toISOString().slice(0, 10);
const newSection = `## [${newVersion}] - ${today}\n\n### Added\n\n### Changed\n\n### Fixed\n\n`;

// Insert after the header line "# Changelog\n\n..."
const headerEnd = changelog.indexOf('\n## ');
let updatedChangelog;
if (headerEnd !== -1) {
  updatedChangelog = `${changelog.slice(0, headerEnd)}\n${newSection}${changelog.slice(headerEnd + 1)}`;
} else {
  // No existing version sections -- append after first two lines
  updatedChangelog = `${changelog.trimEnd()}\n\n${newSection}`;
}

writeFileSync(changelogPath, updatedChangelog, 'utf-8');
console.log(`Updated CHANGELOG.md`);

// ---------------------------------------------------------------------------
// 7. Run typecheck + tests (using execFileSync -- no shell injection)
// ---------------------------------------------------------------------------
function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
}

try {
  run('pnpm', ['run', 'typecheck']);
  run('pnpm', ['test', '--project', 'unit', '--run']);
} catch {
  console.error('\nTypecheck or tests failed. Aborting release.');
  console.error('Version files have been updated -- revert with: git checkout -- .');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 8. Git commit
// ---------------------------------------------------------------------------
run('git', ['add', 'package.json', 'src/shared/version.ts', 'CHANGELOG.md']);
run('git', ['commit', '-m', `release: v${newVersion}`]);

// ---------------------------------------------------------------------------
// 9. Git tag
// ---------------------------------------------------------------------------
run('git', ['tag', `v${newVersion}`]);

// ---------------------------------------------------------------------------
// 10. Print push instructions
// ---------------------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log(`Release v${newVersion} committed and tagged locally.`);
console.log('');
console.log('To publish:');
console.log(`  git push origin HEAD`);
console.log(`  git push origin v${newVersion}`);
console.log('------------------------------------------------------------');

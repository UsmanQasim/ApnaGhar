#!/usr/bin/env node
/**
 * CI gate: every `t('some.key')` referenced in app source must exist in
 * ur.json. A missing key renders as the raw key string on screen — which for a
 * user who cannot read Latin script is indistinguishable from a broken app.
 *
 * Pairs with check-parity.mjs: that one proves ur and en agree, this one proves
 * the code only asks for keys that exist.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const localesDir = join(here, '..', 'src', 'locales');

const SCAN_DIRS = ['apps/mobile', 'apps/admin', 'apps/share', 'apps/web'];

function flatten(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out);
    else out.add(path);
  }
  return out;
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const keys = flatten(JSON.parse(readFileSync(join(localesDir, 'ur.json'), 'utf8')));

const missing = [];
const used = new Set();

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(repoRoot, dir))) {
    const source = readFileSync(file, 'utf8');
    // Matches t('a.b.c') and t("a.b.c"). Dynamic keys are intentionally not
    // matched — if you need one, add an explicit allowlist entry here.
    for (const match of source.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) {
      const key = match[1];
      used.add(key);
      if (!keys.has(key)) missing.push(`${key}  (${relative(repoRoot, file)})`);
    }
  }
}

if (missing.length > 0) {
  console.error(`\n✗ ${missing.length} translation key(s) used but not defined:\n`);
  for (const entry of missing) console.error(`  • ${entry}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ i18n usage OK — ${used.size} keys referenced, all defined`);

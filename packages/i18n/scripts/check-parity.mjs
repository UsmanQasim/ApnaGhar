#!/usr/bin/env node
/**
 * CI gate: every key in en.json must exist in ur.json, with a non-empty value,
 * and vice versa. Urdu is the default locale — shipping an English fallback to
 * an Urdu-speaking user is a bug, not a graceful degradation.
 *
 * Also checks that {{placeholders}} match between locales, because a missing
 * {{price}} in a billing string is a silently wrong invoice.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = join(here, '..', 'src', 'locales');

const read = (name) => JSON.parse(readFileSync(join(localesDir, name), 'utf8'));

function flatten(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

const placeholders = (value) =>
  typeof value === 'string'
    ? [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
    : [];

const en = flatten(read('en.json'));
const ur = flatten(read('ur.json'));

const errors = [];

for (const key of en.keys()) {
  if (!ur.has(key)) errors.push(`missing in ur.json: ${key}`);
}
for (const key of ur.keys()) {
  if (!en.has(key)) errors.push(`missing in en.json: ${key}`);
}

for (const [key, value] of ur) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`empty urdu value: ${key}`);
  }
}

for (const [key, value] of en) {
  if (!ur.has(key)) continue;
  const a = placeholders(value).join(',');
  const b = placeholders(ur.get(key)).join(',');
  if (a !== b) {
    errors.push(`placeholder mismatch at ${key}: en[${a || 'none'}] vs ur[${b || 'none'}]`);
  }
}

if (errors.length > 0) {
  console.error(`\n✗ i18n parity check failed (${errors.length} problem(s)):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ i18n parity OK — ${en.size} keys, en + ur in sync`);

#!/usr/bin/env node
/**
 * CI gate: every key must exist in EVERY locale, with a non-empty value.
 *
 * Urdu is the default locale, not the fallback — shipping an English string to
 * an Urdu-speaking user is a bug, not a graceful degradation. Roman Urdu
 * (ur-Latn) is held to the same standard: it is a locale a real user selects,
 * not a convenience alias for Urdu, so a gap there is just as visible.
 *
 * Also checks that {{placeholders}} match across locales, because a missing
 * {{price}} in a billing string is a silently wrong invoice.
 *
 * ur.json is the reference: it is the one a native speaker maintains, and the
 * one whose key set the app is written against.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = join(here, '..', 'src', 'locales');

const REFERENCE = 'ur.json';
const OTHERS = ['ur-Latn.json', 'en.json'];

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

const reference = flatten(read(REFERENCE));
const errors = [];

for (const [key, value] of reference) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`empty value in ${REFERENCE}: ${key}`);
  }
}

for (const name of OTHERS) {
  const other = flatten(read(name));

  for (const key of reference.keys()) {
    if (!other.has(key)) errors.push(`missing in ${name}: ${key}`);
  }
  for (const key of other.keys()) {
    if (!reference.has(key)) errors.push(`extra in ${name}, not in ${REFERENCE}: ${key}`);
  }

  for (const [key, value] of other) {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`empty value in ${name}: ${key}`);
    }
    if (!reference.has(key)) continue;

    const mine = placeholders(value).join(',');
    const theirs = placeholders(reference.get(key)).join(',');
    if (mine !== theirs) {
      errors.push(
        `placeholder mismatch at ${key}: ${name}[${mine || 'none'}] vs ${REFERENCE}[${theirs || 'none'}]`,
      );
    }
  }

  // Roman Urdu is Latin script. A stray Arabic-script character means a line
  // was copied across from ur.json and never transliterated — invisible to a
  // key-parity check, glaring to a user who chose Roman Urdu because they do
  // not read Nastaliq.
  if (name === 'ur-Latn.json') {
    const ALLOWED_ARABIC = new Set([
      // The language picker names each language in its own script.
      'settings.urdu',
      // Numeral samples: the whole point of the label is to show the glyphs.
      'settings.numeralsUrdu',
      'settings.numeralsLatin',
    ]);
    for (const [key, value] of other) {
      if (ALLOWED_ARABIC.has(key)) continue;
      if (typeof value === 'string' && /[؀-ۿݐ-ݿ]/.test(value)) {
        errors.push(`untransliterated Arabic script in ${name}: ${key} = ${JSON.stringify(value)}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\n✗ i18n parity check failed (${errors.length} problem(s)):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ i18n parity OK — ${reference.size} keys across ${[REFERENCE, ...OTHERS].join(', ')}`,
);

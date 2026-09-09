import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AreaUnit, Locale } from '@ghar/shared';

import {
  formatArea,
  formatPrice,
  formatPriceExact,
  formatRelativeTime,
  formatTimeRemaining,
  isRtl,
  toLatinDigits,
  toUrduDigits,
} from './format';

const ur = { locale: Locale.UR, urduNumerals: false as const };
const roman = { locale: Locale.UR_LATN };
const en = { locale: Locale.EN };

test('prices render as lakh/crore, never as raw digit strings', () => {
  assert.equal(formatPrice(850_000_000, ur), '85 لاکھ روپے'); // Rs 8,500,000
  assert.equal(formatPrice(1_200_000_000, ur), '1.2 کروڑ روپے'); // Rs 12,000,000
  assert.equal(formatPrice(3_500_000, ur), '35 ہزار روپے'); // Rs 35,000
  assert.equal(formatPrice(10_000, ur), '100 روپے'); // the Rs 100 plan
  assert.equal(formatPrice(5_000, ur), '50 روپے'); // the Rs 50 listing fee
  assert.equal(formatPrice(100_000, ur), '1000 روپے'); // Rs 1,000 premium
});

test('english price formatting', () => {
  assert.equal(formatPrice(850_000_000, en), 'Rs 85 Lakh');
  assert.equal(formatPrice(1_200_000_000, en), 'Rs 1.2 Crore');
  assert.equal(formatPrice(10_000, en), 'Rs 100');
});

test('urdu numerals when requested', () => {
  assert.equal(formatPrice(850_000_000, { locale: Locale.UR, urduNumerals: true }), '۸۵ لاکھ روپے');
  assert.equal(toUrduDigits('2026-08-13'), '۲۰۲۶-۰۸-۱۳');
  assert.equal(toLatinDigits('۸۵'), '85');
  assert.equal(toLatinDigits(toUrduDigits('123456789')), '123456789');
});

test('exact price uses south asian digit grouping', () => {
  assert.equal(formatPriceExact(850_000_000, en), 'Rs 85,00,000');
  assert.equal(formatPriceExact(1_234_567_800, en), 'Rs 1,23,45,678');
  assert.equal(formatPriceExact(10_000, en), 'Rs 100');
});

test('area uses marla and kanal by default', () => {
  assert.equal(formatArea(5, AreaUnit.MARLA, ur), '5 مرلہ');
  assert.equal(formatArea(1, AreaUnit.KANAL, ur), '1 کنال');
  assert.equal(formatArea(5, AreaUnit.MARLA, en), '5 Marla');
  assert.equal(formatArea(1200, AreaUnit.SQFT, en), '1200 sq ft');
});

test('relative time in urdu', () => {
  const now = new Date('2026-08-13T12:00:00Z');
  assert.equal(formatRelativeTime(new Date('2026-08-13T11:59:30Z'), ur, now), 'ابھی');
  assert.equal(formatRelativeTime(new Date('2026-08-13T11:30:00Z'), ur, now), '30 منٹ پہلے');
  assert.equal(formatRelativeTime(new Date('2026-08-13T09:00:00Z'), ur, now), '3 گھنٹے پہلے');
  assert.equal(formatRelativeTime(new Date('2026-08-10T12:00:00Z'), ur, now), '3 دن پہلے');
});

test('share link countdown', () => {
  const now = new Date('2026-08-13T12:00:00Z');
  assert.equal(formatTimeRemaining(new Date('2026-08-13T12:27:00Z'), ur, now), '27 منٹ باقی');
  assert.equal(formatTimeRemaining(new Date('2026-08-13T11:00:00Z'), ur, now), 'ختم ہو گیا');
  assert.equal(formatTimeRemaining(null, ur, now), null);
  assert.equal(formatTimeRemaining(new Date('2026-08-13T12:27:00Z'), en, now), '27 min left');
});

test('urdu is rtl, english is not', () => {
  assert.equal(isRtl(Locale.UR), true);
  assert.equal(isRtl(Locale.EN), false);
});

// ─── Roman Urdu ──────────────────────────────────────────────────────────────
//
// The failure mode these guard against is not a wrong translation, it is a
// locale falling through a two-branch `if`. Every helper here used to test
// `locale === UR` and send everything else down the English path, so Roman
// Urdu would have read as Urdu grammar with English words — or worse, printed
// Nastaliq into a Latin-script page.

test('roman urdu prices keep urdu words and urdu word order', () => {
  assert.equal(formatPrice(850_000_000, roman), '85 lakh rupay');
  assert.equal(formatPrice(1_200_000_000, roman), '1.2 crore rupay');
  assert.equal(formatPrice(3_500_000, roman), '35 hazaar rupay');
  assert.equal(formatPrice(10_000, roman), '100 rupay');

  // The currency word TRAILS, as it does in Urdu — "Rs 85 Lakh" is the
  // English shape and would be wrong here.
  assert.ok(!formatPrice(850_000_000, roman).startsWith('rupay'));
});

test('roman urdu never emits arabic script', () => {
  const arabic = /[\u0600-\u06FF]/;
  const now = new Date('2026-08-13T12:00:00Z');

  const samples = [
    formatPrice(850_000_000, roman),
    formatPriceExact(1_234_567_800, roman),
    formatArea(5, AreaUnit.MARLA, roman),
    formatArea(1, AreaUnit.KANAL, roman),
    formatArea(2400, AreaUnit.SQFT, roman),
    formatRelativeTime(new Date('2026-08-10T12:00:00Z'), roman, now),
    formatTimeRemaining(new Date('2026-08-13T12:27:00Z'), roman, now) ?? '',
    formatTimeRemaining(new Date('2026-08-13T11:00:00Z'), roman, now) ?? '',
  ];

  for (const sample of samples) {
    assert.ok(!arabic.test(sample), `arabic script leaked into roman urdu: ${sample}`);
  }
});

test('roman urdu uses latin digits, not urdu-indic', () => {
  // formatPriceExact used to hardcode روپے; it also must not switch numerals.
  assert.equal(formatPriceExact(1_234_567_800, roman), '1,23,45,678 rupay');
  assert.ok(!/[\u06F0-\u06F9]/.test(formatPrice(850_000_000, roman)));

  // South Asian digit grouping survives the script change: 1,23,45,678 — not
  // 12,345,678.
  assert.ok(formatPriceExact(1_234_567_800, roman).startsWith('1,23,45,678'));
});

test('roman urdu relative time and countdown', () => {
  const now = new Date('2026-08-13T12:00:00Z');
  assert.equal(formatRelativeTime(new Date('2026-08-13T11:59:30Z'), roman, now), 'abhi');
  assert.equal(formatRelativeTime(new Date('2026-08-13T11:30:00Z'), roman, now), '30 minute pehlay');
  assert.equal(formatRelativeTime(new Date('2026-08-10T12:00:00Z'), roman, now), '3 din pehlay');

  assert.equal(formatTimeRemaining(new Date('2026-08-13T12:27:00Z'), roman, now), '27 minute baqi');
  assert.equal(formatTimeRemaining(new Date('2026-08-13T11:00:00Z'), roman, now), 'khatam ho gaya');
  assert.equal(formatTimeRemaining(null, roman, now), null);
});

test('roman urdu is left-to-right — it is urdu, but not rtl', () => {
  assert.equal(isRtl(Locale.UR_LATN), false);
  assert.equal(isRtl(Locale.UR), true);
});

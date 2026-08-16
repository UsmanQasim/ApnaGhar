import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildSecureHash,
  formatJazzCashTimestamp,
  isJazzCashSuccessCode,
  verifySecureHash,
} from './jazzcash.hash';

const SALT = 'test_integrity_salt_123';

const params = (): Record<string, string> => ({
  pp_Version: '2.0',
  pp_TxnType: 'MWALLET',
  pp_MerchantID: 'MC12345',
  pp_Password: 'secret',
  pp_TxnRefNo: 'T20260813120000abc123',
  pp_Amount: '10000', // Rs 100 in paisa — the basic plan
  pp_TxnCurrency: 'PKR',
  pp_ResponseCode: '000',
});

test('hash is deterministic and independent of key insertion order', () => {
  const a = buildSecureHash(SALT, params());
  const shuffled: Record<string, string> = {};
  for (const key of Object.keys(params()).reverse()) {
    shuffled[key] = params()[key] as string;
  }
  assert.equal(buildSecureHash(SALT, shuffled), a);
});

test('hash is uppercase hex of the right length', () => {
  const hash = buildSecureHash(SALT, params());
  assert.match(hash, /^[0-9A-F]{64}$/);
});

test('a different salt produces a different hash', () => {
  assert.notEqual(buildSecureHash(SALT, params()), buildSecureHash('other_salt', params()));
});

test('empty values are excluded from the signed payload', () => {
  const withEmpty = { ...params(), pp_MobileNumber: '' };
  assert.equal(buildSecureHash(SALT, withEmpty), buildSecureHash(SALT, params()));
});

test('pp_SecureHash is never part of its own input', () => {
  const base = buildSecureHash(SALT, params());
  assert.equal(buildSecureHash(SALT, { ...params(), pp_SecureHash: base }), base);
});

test('a tampered amount invalidates the hash — the whole point', () => {
  const signed = { ...params() };
  signed['pp_SecureHash'] = buildSecureHash(SALT, signed);
  assert.equal(verifySecureHash(SALT, signed), true);

  // Attacker changes Rs 100 to Rs 1 and replays the callback.
  const tampered = { ...signed, pp_Amount: '100' };
  assert.equal(verifySecureHash(SALT, tampered), false);
});

test('a forged callback with no hash is rejected', () => {
  assert.equal(verifySecureHash(SALT, params()), false);
  assert.equal(verifySecureHash(SALT, { ...params(), pp_SecureHash: 'deadbeef' }), false);
});

test('verification is case-insensitive on the received hash', () => {
  const signed = { ...params() };
  signed['pp_SecureHash'] = buildSecureHash(SALT, signed).toLowerCase();
  assert.equal(verifySecureHash(SALT, signed), true);
});

test('timestamps are formatted in Pakistan Standard Time, not UTC', () => {
  // 2026-08-13T12:00:00Z is 17:00 in Karachi.
  assert.equal(formatJazzCashTimestamp(new Date('2026-08-13T12:00:00Z')), '20260813170000');
  // Check the date rolls over correctly across midnight PKT.
  assert.equal(formatJazzCashTimestamp(new Date('2026-08-13T19:30:00Z')), '20260814003000');
});

test('only 000 and 121 count as success', () => {
  assert.equal(isJazzCashSuccessCode('000'), true);
  assert.equal(isJazzCashSuccessCode('121'), true);
  assert.equal(isJazzCashSuccessCode('001'), false);
  assert.equal(isJazzCashSuccessCode(''), false);
  assert.equal(isJazzCashSuccessCode('124'), false);
});

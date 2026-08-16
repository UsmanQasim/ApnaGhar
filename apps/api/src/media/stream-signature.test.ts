import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  REPLAY_WINDOW_SECONDS,
  computeStreamSignature,
  parseSignatureHeader,
  verifyStreamSignature,
} from './stream-signature';

const SECRET = 'stream_webhook_secret';
const NOW = new Date('2026-08-13T12:00:00Z');
const TIME = Math.floor(NOW.getTime() / 1000);

const BODY = JSON.stringify({ uid: 'abc123', readyToStream: true, duration: 42 });

function sign(body: string, time = TIME, secret = SECRET): string {
  return `time=${time},sig1=${computeStreamSignature(secret, time, body)}`;
}

test('a correctly signed webhook is accepted', () => {
  assert.equal(verifyStreamSignature(SECRET, sign(BODY), BODY, NOW), true);
});

test('a tampered body is rejected — this is the whole point', () => {
  const header = sign(BODY);
  // Attacker flips a different video to ready.
  const tampered = JSON.stringify({ uid: 'someone-elses-video', readyToStream: true });
  assert.equal(verifyStreamSignature(SECRET, header, tampered, NOW), false);
});

test('a wrong secret is rejected', () => {
  assert.equal(verifyStreamSignature(SECRET, sign(BODY, TIME, 'wrong'), BODY, NOW), false);
});

test('an unsigned request is rejected', () => {
  assert.equal(verifyStreamSignature(SECRET, undefined, BODY, NOW), false);
  assert.equal(verifyStreamSignature(SECRET, '', BODY, NOW), false);
  assert.equal(verifyStreamSignature(SECRET, 'garbage', BODY, NOW), false);
  assert.equal(verifyStreamSignature(SECRET, `time=${TIME}`, BODY, NOW), false);
});

test('a replayed webhook outside the window is rejected', () => {
  const old = TIME - REPLAY_WINDOW_SECONDS - 1;
  assert.equal(verifyStreamSignature(SECRET, sign(BODY, old), BODY, NOW), false);

  // Just inside the window still passes.
  const recent = TIME - REPLAY_WINDOW_SECONDS + 10;
  assert.equal(verifyStreamSignature(SECRET, sign(BODY, recent), BODY, NOW), true);
});

test('a future-dated timestamp is rejected too', () => {
  // Clock skew is bounded in both directions; a far-future stamp would
  // otherwise mint a signature valid for as long as the attacker chose.
  const future = TIME + REPLAY_WINDOW_SECONDS + 60;
  assert.equal(verifyStreamSignature(SECRET, sign(BODY, future), BODY, NOW), false);
});

test('signature is bound to the exact bytes, including whitespace', () => {
  const header = sign(BODY);
  const reserialised = JSON.stringify(JSON.parse(BODY), null, 2);
  assert.notEqual(reserialised, BODY);
  // Documents why the controller must use the RAW body, not the parsed one.
  assert.equal(verifyStreamSignature(SECRET, header, reserialised, NOW), false);
});

test('header parsing tolerates spacing and ignores unknown fields', () => {
  const parsed = parseSignatureHeader(`time=${TIME}, sig1=deadbeef, sig2=ignored`);
  assert.deepEqual(parsed, { time: TIME, signature: 'deadbeef' });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PropertyStatus,
  PropertyVisibility,
  SubscriptionStatus,
  UserRole,
} from './enums';
import {
  canAgentWrite,
  canViewProperty,
  evaluateShareLink,
  type ViewableProperty,
} from './visibility';

const base: ViewableProperty = {
  agentId: 'agent-1',
  visibility: PropertyVisibility.PUBLIC,
  status: PropertyStatus.ACTIVE,
  agentSubscriptionStatus: SubscriptionStatus.ACTIVE,
};

const customer = { userId: 'cust-1', role: UserRole.CUSTOMER };
const otherAgent = { userId: 'agent-2', role: UserRole.AGENT };
const owner = { userId: 'agent-1', role: UserRole.AGENT };
const anon = { userId: null, role: null };

test('public listing is visible to everyone including anonymous', () => {
  assert.deepEqual(canViewProperty(base, customer), { allowed: true });
  assert.deepEqual(canViewProperty(base, otherAgent), { allowed: true });
  assert.deepEqual(canViewProperty(base, anon), { allowed: true });
});

test('hidden_from_agents blocks other agents but not customers', () => {
  const p = { ...base, visibility: PropertyVisibility.HIDDEN_FROM_AGENTS };
  assert.deepEqual(canViewProperty(p, customer), { allowed: true });
  assert.deepEqual(canViewProperty(p, anon), { allowed: true });
  assert.deepEqual(canViewProperty(p, otherAgent), {
    allowed: false,
    reason: 'hidden_from_agents',
  });
  assert.deepEqual(canViewProperty(p, owner), { allowed: true });
});

test('private listing is unreachable without a share link', () => {
  const p = { ...base, visibility: PropertyVisibility.PRIVATE };
  assert.deepEqual(canViewProperty(p, customer), {
    allowed: false,
    reason: 'private_requires_share_link',
  });
  assert.deepEqual(canViewProperty(p, customer, { via: 'share_link', valid: true }), {
    allowed: true,
  });
  assert.deepEqual(canViewProperty(p, customer, { via: 'share_link', valid: false }), {
    allowed: false,
    reason: 'share_link_invalid',
  });
});

test('restricted agent blacks out listings for everyone but the owner and admin', () => {
  const p = { ...base, agentSubscriptionStatus: SubscriptionStatus.RESTRICTED };
  assert.deepEqual(canViewProperty(p, customer), { allowed: false, reason: 'owner_restricted' });
  // Share links stop working too.
  assert.deepEqual(canViewProperty(p, customer, { via: 'share_link', valid: true }), {
    allowed: false,
    reason: 'owner_restricted',
  });
  // The agent still sees his own work — nothing is deleted.
  assert.deepEqual(canViewProperty(p, owner), { allowed: true });
  assert.deepEqual(canViewProperty(p, { userId: 'admin-1', role: UserRole.ADMIN }), {
    allowed: true,
  });
});

test('past_due agent keeps full visibility during the 7-day grace period', () => {
  const p = { ...base, agentSubscriptionStatus: SubscriptionStatus.PAST_DUE };
  assert.deepEqual(canViewProperty(p, customer), { allowed: true });
  assert.equal(canAgentWrite(SubscriptionStatus.PAST_DUE), true);
  assert.equal(canAgentWrite(SubscriptionStatus.RESTRICTED), false);
  assert.equal(canAgentWrite(SubscriptionStatus.DORMANT), false);
});

test('drafts are never public, even via a valid share link', () => {
  const p = { ...base, status: PropertyStatus.DRAFT };
  assert.deepEqual(canViewProperty(p, customer), { allowed: false, reason: 'not_published' });
  assert.deepEqual(canViewProperty(p, customer, { via: 'share_link', valid: true }), {
    allowed: false,
    reason: 'not_published',
  });
});

test('sold and rented listings stay viewable (social proof, not deleted)', () => {
  assert.deepEqual(canViewProperty({ ...base, status: PropertyStatus.SOLD }, customer), {
    allowed: true,
  });
  assert.deepEqual(canViewProperty({ ...base, status: PropertyStatus.RENTED }, customer), {
    allowed: true,
  });
});

// ── Share links ─────────────────────────────────────────────────────────────

const now = new Date('2026-08-13T12:00:00Z');

test('share link expires after 30 minutes', () => {
  const link = {
    expiresAt: new Date('2026-08-13T12:30:00Z'),
    maxViews: null,
    viewCount: 0,
    revokedAt: null,
  };
  assert.deepEqual(evaluateShareLink(link, now), { valid: true });
  assert.deepEqual(evaluateShareLink(link, new Date('2026-08-13T12:31:00Z')), {
    valid: false,
    reason: 'expired',
  });
});

test('share link with no expiry stays valid', () => {
  assert.deepEqual(
    evaluateShareLink({ expiresAt: null, maxViews: null, viewCount: 99, revokedAt: null }, now),
    { valid: true },
  );
});

test('view-limited share link stops at the cap', () => {
  const link = { expiresAt: null, maxViews: 1, viewCount: 0, revokedAt: null };
  assert.deepEqual(evaluateShareLink(link, now), { valid: true });
  assert.deepEqual(evaluateShareLink({ ...link, viewCount: 1 }, now), {
    valid: false,
    reason: 'view_limit_reached',
  });
});

test('revocation beats everything', () => {
  assert.deepEqual(
    evaluateShareLink(
      { expiresAt: null, maxViews: null, viewCount: 0, revokedAt: new Date('2026-08-13T11:00:00Z') },
      now,
    ),
    { valid: false, reason: 'revoked' },
  );
});

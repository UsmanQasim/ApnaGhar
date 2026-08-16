import {
  PropertyStatus,
  PropertyVisibility,
  SubscriptionStatus,
  UserRole,
  WRITABLE_SUBSCRIPTION_STATUSES,
} from './enums';

/**
 * Server-side visibility rules. These are enforced in a Nest guard, never in
 * the app. A client-side check is a suggestion; this is the actual boundary.
 */

export interface Viewer {
  userId: string | null;
  role: UserRole | null;
}

export interface ViewableProperty {
  agentId: string;
  visibility: PropertyVisibility;
  status: PropertyStatus;
  /** Owning agent's subscription status — drives the restriction blackout. */
  agentSubscriptionStatus: SubscriptionStatus;
}

export type ViewContext =
  | { via: 'direct' }
  | { via: 'share_link'; valid: boolean };

export type VisibilityDenialReason =
  | 'owner_restricted'
  | 'not_published'
  | 'private_requires_share_link'
  | 'hidden_from_agents'
  | 'share_link_invalid';

export type VisibilityResult =
  | { allowed: true }
  | { allowed: false; reason: VisibilityDenialReason };

const PUBLICLY_LISTABLE: readonly PropertyStatus[] = [
  PropertyStatus.ACTIVE,
  PropertyStatus.SOLD,
  PropertyStatus.RENTED,
];

export function canViewProperty(
  property: ViewableProperty,
  viewer: Viewer,
  context: ViewContext = { via: 'direct' },
): VisibilityResult {
  const isOwner = viewer.userId !== null && viewer.userId === property.agentId;
  const isAdmin = viewer.role === UserRole.ADMIN;

  // The owner and admins always see everything, including during restriction.
  if (isOwner || isAdmin) return { allowed: true };

  // Restriction blackout: agent's data is preserved but nothing is viewable.
  if (!WRITABLE_SUBSCRIPTION_STATUSES.includes(property.agentSubscriptionStatus)) {
    return { allowed: false, reason: 'owner_restricted' };
  }

  if (context.via === 'share_link') {
    // A valid share link overrides `private` and `hidden_from_agents`.
    // It does NOT override draft/archived — there is nothing to show.
    if (!context.valid) return { allowed: false, reason: 'share_link_invalid' };
    if (property.status === PropertyStatus.DRAFT || property.status === PropertyStatus.ARCHIVED) {
      return { allowed: false, reason: 'not_published' };
    }
    return { allowed: true };
  }

  if (!PUBLICLY_LISTABLE.includes(property.status)) {
    return { allowed: false, reason: 'not_published' };
  }

  switch (property.visibility) {
    case PropertyVisibility.PUBLIC:
      return { allowed: true };
    case PropertyVisibility.HIDDEN_FROM_AGENTS:
      return viewer.role === UserRole.AGENT
        ? { allowed: false, reason: 'hidden_from_agents' }
        : { allowed: true };
    case PropertyVisibility.PRIVATE:
      return { allowed: false, reason: 'private_requires_share_link' };
  }
}

/** Whether an agent may create/edit listings and mint share links right now. */
export function canAgentWrite(status: SubscriptionStatus): boolean {
  return WRITABLE_SUBSCRIPTION_STATUSES.includes(status);
}

export interface ShareLinkState {
  expiresAt: Date | null;
  maxViews: number | null;
  viewCount: number;
  revokedAt: Date | null;
}

export type ShareLinkInvalidReason = 'revoked' | 'expired' | 'view_limit_reached';

export function evaluateShareLink(
  link: ShareLinkState,
  now: Date = new Date(),
): { valid: true } | { valid: false; reason: ShareLinkInvalidReason } {
  if (link.revokedAt !== null) return { valid: false, reason: 'revoked' };
  if (link.expiresAt !== null && link.expiresAt.getTime() <= now.getTime()) {
    return { valid: false, reason: 'expired' };
  }
  if (link.maxViews !== null && link.viewCount >= link.maxViews) {
    return { valid: false, reason: 'view_limit_reached' };
  }
  return { valid: true };
}

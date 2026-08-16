export const Locale = { UR: 'ur', EN: 'en' } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];
export const LOCALES: readonly Locale[] = [Locale.UR, Locale.EN];
export const DEFAULT_LOCALE: Locale = Locale.UR;

export const UserRole = { CUSTOMER: 'customer', AGENT: 'agent', ADMIN: 'admin' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = { ACTIVE: 'active', SUSPENDED: 'suspended' } as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const PlanCode = { BASIC: 'basic', PREMIUM: 'premium' } as const;
export type PlanCode = (typeof PlanCode)[keyof typeof PlanCode];

export const SubscriptionStatus = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  RESTRICTED: 'restricted',
  DORMANT: 'dormant',
  CANCELLED: 'cancelled',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

/** Statuses in which the agent may still create/edit listings and share links. */
export const WRITABLE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

export const PropertyPurpose = { SALE: 'sale', RENT: 'rent' } as const;
export type PropertyPurpose = (typeof PropertyPurpose)[keyof typeof PropertyPurpose];

export const PropertyType = {
  HOUSE: 'house',
  FLAT: 'flat',
  PLOT: 'plot',
  SHOP: 'shop',
  OFFICE: 'office',
  WAREHOUSE: 'warehouse',
} as const;
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const AreaUnit = { MARLA: 'marla', KANAL: 'kanal', SQFT: 'sqft', SQYD: 'sqyd' } as const;
export type AreaUnit = (typeof AreaUnit)[keyof typeof AreaUnit];

export const PriceVisibility = { PUBLIC: 'public', ON_REQUEST: 'on_request' } as const;
export type PriceVisibility = (typeof PriceVisibility)[keyof typeof PriceVisibility];

export const PropertyVisibility = {
  /** Everyone: feed, search, agent profile. */
  PUBLIC: 'public',
  /** Customers + owning agent. Other agent accounts get 404. */
  HIDDEN_FROM_AGENTS: 'hidden_from_agents',
  /** Owning agent only. Reachable exclusively via a share link. */
  PRIVATE: 'private',
} as const;
export type PropertyVisibility = (typeof PropertyVisibility)[keyof typeof PropertyVisibility];

export const PropertyStatus = {
  DRAFT: 'draft',
  PENDING_PAYMENT: 'pending_payment',
  ACTIVE: 'active',
  SOLD: 'sold',
  RENTED: 'rented',
  EXPIRED: 'expired',
  ARCHIVED: 'archived',
} as const;
export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

/**
 * Statuses that consume a listing quota slot.
 * Marking sold/rented frees the slot; the Rs 50 already paid is NOT refunded.
 */
export const QUOTA_CONSUMING_STATUSES: readonly PropertyStatus[] = [
  PropertyStatus.ACTIVE,
  PropertyStatus.PENDING_PAYMENT,
];

export const MediaKind = { IMAGE: 'image', VIDEO: 'video' } as const;
export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

export const MediaProcessingStatus = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;
export type MediaProcessingStatus =
  (typeof MediaProcessingStatus)[keyof typeof MediaProcessingStatus];

export const InvoiceStatus = {
  OPEN: 'open',
  DUE: 'due',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const InvoiceItemType = {
  SUBSCRIPTION: 'subscription',
  LISTING_FEE: 'listing_fee',
  PREMIUM: 'premium',
  BOOST: 'boost',
  CREDIT: 'credit',
  ADJUSTMENT: 'adjustment',
} as const;
export type InvoiceItemType = (typeof InvoiceItemType)[keyof typeof InvoiceItemType];

export const PaymentProviderCode = {
  MANUAL_EASYPAISA: 'manual_easypaisa',
  MANUAL_JAZZCASH: 'manual_jazzcash',
  JAZZCASH_API: 'jazzcash_api',
  EASYPAISA_API: 'easypaisa_api',
  CARD: 'card',
} as const;
export type PaymentProviderCode =
  (typeof PaymentProviderCode)[keyof typeof PaymentProviderCode];

export const MANUAL_PROVIDERS: readonly PaymentProviderCode[] = [
  PaymentProviderCode.MANUAL_EASYPAISA,
  PaymentProviderCode.MANUAL_JAZZCASH,
];

export const PaymentStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const LedgerDirection = { DEBIT: 'debit', CREDIT: 'credit' } as const;
export type LedgerDirection = (typeof LedgerDirection)[keyof typeof LedgerDirection];

export const LeadChannel = {
  CALL: 'call',
  WHATSAPP: 'whatsapp',
  IN_APP: 'in_app',
  SHARE_LINK: 'share_link',
} as const;
export type LeadChannel = (typeof LeadChannel)[keyof typeof LeadChannel];

export const ViewSource = {
  FEED: 'feed',
  SEARCH: 'search',
  SHARE: 'share',
  PROFILE: 'profile',
} as const;
export type ViewSource = (typeof ViewSource)[keyof typeof ViewSource];

export const BoostType = { TOP_SEARCH: 'top_search', FEATURED_HOME: 'featured_home' } as const;
export type BoostType = (typeof BoostType)[keyof typeof BoostType];

/** Share-link expiry presets offered in the UI. `null` = never expires. */
export const SHARE_EXPIRY_PRESETS = [
  { key: '30m', minutes: 30 },
  { key: '2h', minutes: 120 },
  { key: '24h', minutes: 1440 },
  { key: '7d', minutes: 10080 },
  { key: 'never', minutes: null },
] as const;
export type ShareExpiryPresetKey = (typeof SHARE_EXPIRY_PRESETS)[number]['key'];

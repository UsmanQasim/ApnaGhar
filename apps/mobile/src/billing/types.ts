import type { InvoiceItemType, InvoiceStatus, PlanCode, SubscriptionStatus } from '@ghar/shared';

/** Money crosses the wire as a STRING — Prisma emits BigInt, JSON has no BigInt. */
export interface InvoiceItem {
  id: string;
  type: InvoiceItemType;
  descriptionUr: string;
  descriptionEn: string;
  amountPaisa: string;
}

export interface Invoice {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  subtotalPaisa: string;
  totalPaisa: string;
  amountPaidPaisa: string;
  status: InvoiceStatus;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: InvoiceItem[];
}

export interface BillingSummary {
  plan: PlanCode;
  planPricePaisa: number;
  /** null = unlimited. Never render a hardcoded number here — see README §2. */
  includedListings: number | null;
  activeListings: number;
  slotsRemaining: number | null;
  nextListingFeePaisa: number;
  balancePaisa: string;
  subscription: {
    planCode: PlanCode;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
    graceEndsAt: string | null;
  } | null;
  openInvoice: Invoice | null;
  recentSpendPaisa: string;
  recentCycles: number;
  /** Server-computed from ACTUAL spend. null means: show no upsell at all. */
  premiumSavingPaisa: string | null;
}

/** i18n key for an invoice status chip. */
export const INVOICE_STATUS_KEY: Record<InvoiceStatus, string> = {
  open: 'billing.statusOpen',
  due: 'billing.statusDue',
  partially_paid: 'billing.statusPartiallyPaid',
  paid: 'billing.statusPaid',
  overdue: 'billing.statusOverdue',
  void: 'billing.statusVoid',
};

/** i18n key for a line-item type, used when the server description is absent. */
export const INVOICE_ITEM_KEY: Record<InvoiceItemType, string> = {
  subscription: 'billing.itemSubscription',
  listing_fee: 'billing.itemListingFee',
  premium: 'billing.itemPremium',
  boost: 'billing.itemBoost',
  credit: 'billing.itemCredit',
  adjustment: 'billing.itemAdjustment',
};

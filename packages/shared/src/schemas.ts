import { z } from 'zod';

import {
  AreaUnit,
  BoostType,
  LeadChannel,
  Locale,
  MediaKind,
  PaymentProviderCode,
  PlanCode,
  PriceVisibility,
  PropertyPurpose,
  PropertyType,
  PropertyVisibility,
  ViewSource,
} from './enums';

const enumValues = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as [T[keyof T], ...T[keyof T][]];

/** Pakistani mobile number, normalised to E.164: +923XXXXXXXXX */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+92|0092|92|0)?3\d{9}$/.test(v), {
    message: 'invalid_pk_mobile_number',
  })
  .transform((v) => `+92${v.replace(/^(\+92|0092|92|0)/, '')}`);

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  locale: z.enum(enumValues(Locale)).default(Locale.UR),
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/),
  deviceId: z.string().max(128).optional(),
});

export const localizedTextSchema = z.object({
  ur: z.string().trim().min(1).max(2000),
  en: z.string().trim().max(2000).optional(),
});

export const coordinatesSchema = z.object({
  // Pakistan's rough bounding box — rejects obviously bad pins.
  lat: z.number().min(23.5).max(37.2),
  lng: z.number().min(60.8).max(77.9),
});

/**
 * Base shape, unrefined. `createPropertySchema` adds cross-field rules on top;
 * `updatePropertySchema` derives from the base because a partial update can't
 * satisfy cross-field rules that reference absent fields.
 */
export const propertyFieldsSchema = z
  .object({
    purpose: z.enum(enumValues(PropertyPurpose)),
    type: z.enum(enumValues(PropertyType)),
    titleUr: z.string().trim().min(3).max(140),
    titleEn: z.string().trim().max(140).optional(),
    descriptionUr: z.string().trim().max(4000).optional(),
    descriptionEn: z.string().trim().max(4000).optional(),

    pricePaisa: z.number().int().nonnegative().optional(),
    priceVisibility: z.enum(enumValues(PriceVisibility)).default(PriceVisibility.PUBLIC),
    rentPeriod: z.enum(['month', 'year']).optional(),

    areaValue: z.number().positive(),
    areaUnit: z.enum(enumValues(AreaUnit)),
    bedrooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(50).optional(),
    floors: z.number().int().min(0).max(50).optional(),
    furnished: z.boolean().default(false),

    addressText: z.string().trim().max(300).optional(),
    city: z.string().trim().min(2).max(80),
    locality: z.string().trim().max(120).optional(),
    location: coordinatesSchema.optional(),

    visibility: z.enum(enumValues(PropertyVisibility)).default(PropertyVisibility.PUBLIC),
  });

export const createPropertySchema = propertyFieldsSchema
  .refine(
    (v) => v.priceVisibility === PriceVisibility.ON_REQUEST || typeof v.pricePaisa === 'number',
    { message: 'price_required_unless_on_request', path: ['pricePaisa'] },
  )
  .refine((v) => v.purpose !== PropertyPurpose.RENT || v.rentPeriod !== undefined, {
    message: 'rent_period_required_for_rentals',
    path: ['rentPeriod'],
  });

export const updatePropertySchema = propertyFieldsSchema.partial();

export const publishPropertySchema = z.object({
  /** true = pay the Rs 50 now; false = accrue it to the month-end invoice. */
  payListingFeeNow: z.boolean().default(false),
});

export const markSoldSchema = z.object({
  outcome: z.enum(['sold', 'rented']),
  /** Optional, private, agent-reported. Powers the dashboard revenue chart. */
  salePricePaisa: z.number().int().nonnegative().optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
});

export const searchPropertiesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  purpose: z.enum(enumValues(PropertyPurpose)).optional(),
  type: z.array(z.enum(enumValues(PropertyType))).optional(),
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  minPricePaisa: z.number().int().nonnegative().optional(),
  maxPricePaisa: z.number().int().nonnegative().optional(),
  minAreaSqft: z.number().nonnegative().optional(),
  maxAreaSqft: z.number().nonnegative().optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  furnished: z.boolean().optional(),
  hasVideo: z.boolean().optional(),
  verifiedAgentsOnly: z.boolean().optional(),
  near: coordinatesSchema.optional(),
  radiusKm: z.number().positive().max(100).default(10),
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'nearest']).default('relevance'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const createShareLinkSchema = z.object({
  propertyId: z.string().uuid(),
  /** null = never expires. Minutes from now otherwise. */
  expiresInMinutes: z.number().int().positive().max(525_600).nullable().default(30),
  maxViews: z.number().int().positive().max(1000).nullable().default(null),
  recipientName: z.string().trim().max(80).optional(),
  recipientPhone: phoneSchema.optional(),
  /** Gate the link behind an OTP to the recipient's number. */
  requireOtp: z.boolean().default(false),
});

export const createCommentSchema = z.object({
  propertyId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(1000),
});

export const recordViewSchema = z.object({
  propertyId: z.string().uuid(),
  source: z.enum(enumValues(ViewSource)),
  /** Fraction of the video watched, 0..1. Powers premium watch-through stats. */
  watchRatio: z.number().min(0).max(1).optional(),
});

export const createLeadSchema = z.object({
  propertyId: z.string().uuid(),
  channel: z.enum(enumValues(LeadChannel)),
});

export const requestMediaUploadSchema = z.object({
  propertyId: z.string().uuid(),
  kind: z.enum(enumValues(MediaKind)),
  contentType: z.string().regex(/^(image\/(jpeg|png|webp|heic)|video\/(mp4|quicktime))$/),
  byteSize: z.number().int().positive(),
});

export const submitManualPaymentSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  provider: z.enum([PaymentProviderCode.MANUAL_EASYPAISA, PaymentProviderCode.MANUAL_JAZZCASH]),
  amountPaisa: z.number().int().positive(),
  providerTxnId: z.string().trim().min(4).max(64),
  payerMsisdn: phoneSchema,
  /** Storage key of the uploaded screenshot. */
  proofKey: z.string().min(1).max(300),
});

export const verifyManualPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional(),
});

export const changePlanSchema = z.object({
  plan: z.enum(enumValues(PlanCode)),
  /** Premium upgrades may take effect immediately with a prorated credit. */
  immediate: z.boolean().default(false),
});

export const createBoostSchema = z.object({
  propertyId: z.string().uuid(),
  type: z.enum(enumValues(BoostType)),
  durationHours: z.number().int().min(24).max(168).default(72),
});

export type OtpRequest = z.infer<typeof otpRequestSchema>;
export type OtpVerify = z.infer<typeof otpVerifySchema>;
export type CreateProperty = z.infer<typeof createPropertySchema>;
export type UpdateProperty = z.infer<typeof updatePropertySchema>;
export type SearchProperties = z.infer<typeof searchPropertiesSchema>;
export type CreateShareLink = z.infer<typeof createShareLinkSchema>;
export type RequestMediaUpload = z.infer<typeof requestMediaUploadSchema>;
export type SubmitManualPayment = z.infer<typeof submitManualPaymentSchema>;
export type MarkSold = z.infer<typeof markSoldSchema>;

import { Locale } from '@ghar/shared';

/**
 * Copy for the share host, in all three languages.
 *
 * A typed object rather than a `t('some.key')` lookup, on purpose. These are
 * Server Components: a dictionary indexed by a plain property path is checked
 * by TypeScript, so a key added to Urdu and forgotten in Roman Urdu is a build
 * error rather than a string that renders as "share.expired" for one group of
 * users. The `Record<Locale, Copy>` below is what enforces it.
 */
const ur = {
  brand: 'گھر — شیئر لنک',

  index: {
    intro:
      'یہ صفحہ صرف ان لنکس کے لیے ہے جو ایجنٹ آپ کو بھیجتے ہیں۔ ہر لنک ایک ہی پراپرٹی کھولتی ہے۔',
    linkShapeLabel: 'لنک کی شکل',
    troubleshoot:
      'اگر ایجنٹ کی بھیجی ہوئی لنک نہیں کھل رہی تو ممکن ہے اس کی مدت ختم ہو گئی ہو، ایجنٹ نے اسے بند کر دیا ہو، یا اسے دیکھنے کی حد پوری ہو چکی ہو۔ ایسی صورت میں ایجنٹ سے نئی لنک منگوائیں۔',
    visitWebsite: 'گھر کی ویب سائٹ دیکھیں',
  },

  notFound: {
    title: 'لنک نہیں ملی',
    warning: 'یہ لنک درست نہیں ہے، یا اس کی مدت ختم ہو چکی ہے۔',
    hint: 'براہِ کرم ایجنٹ کی بھیجی ہوئی مکمل لنک دوبارہ کھولیں، یا ان سے نئی لنک منگوائیں۔',
  },

  listing: {
    priceOnRequest: 'قیمت: رابطہ کریں',
    linkNotice: 'یہ لنک',
    bedrooms: 'بیڈرومز',
    bathrooms: 'باتھ رومز',
    area: 'رقبہ',
    call: 'کال کریں',
    whatsapp: 'واٹس ایپ',
  },

  expired: {
    onceOnly: 'یہ لنک صرف ایک بار دیکھا جا سکتا تھا',
    revoked: 'ایجنٹ نے یہ لنک بند کر دیا ہے',
    generic: 'یہ لنک ختم ہو گیا',
    askForNew: 'ایجنٹ سے نیا لنک منگوائیں',
  },

  language: 'زبان',
};

/**
 * NOT `as const`. With it, `typeof ur` is a wall of literal types — the Roman
 * Urdu bundle then fails to compile with 'Type "Link nahi mili" is not
 * assignable to type "لنک نہیں ملی"'. Letting TypeScript infer `string`
 * keeps the useful half of the check: same keys, same shape, every locale.
 */
type Copy = typeof ur;

const urLatn: Copy = {
  brand: 'Ghar — share link',

  index: {
    intro:
      'Yeh safha sirf un links ke liye hai jo agent aap ko bhejta hai. Har link aik hi property kholti hai.',
    linkShapeLabel: 'Link ki shakal',
    troubleshoot:
      'Agar agent ki bheji hui link nahi khul rahi to mumkin hai is ki muddat khatam ho gayi ho, agent ne isay band kar diya ho, ya isay dekhne ki hadd poori ho chuki ho. Aisi soorat mein agent se nayi link mangwayein.',
    visitWebsite: 'Ghar ki website dekhein',
  },

  notFound: {
    title: 'Link nahi mili',
    warning: 'Yeh link durust nahi hai, ya is ki muddat khatam ho chuki hai.',
    hint: 'Barah-e-karam agent ki bheji hui mukammal link dobara kholein, ya un se nayi link mangwayein.',
  },

  listing: {
    priceOnRequest: 'Qeemat: rabta karein',
    linkNotice: 'Yeh link',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    area: 'Raqba',
    call: 'Call karein',
    whatsapp: 'WhatsApp',
  },

  expired: {
    onceOnly: 'Yeh link sirf aik baar dekha ja sakta tha',
    revoked: 'Agent ne yeh link band kar diya hai',
    generic: 'Yeh link khatam ho gaya',
    askForNew: 'Agent se naya link mangwayein',
  },

  language: 'Zaban',
};

const en: Copy = {
  brand: 'Ghar — share link',

  index: {
    intro:
      'This page is only for links an agent sends you. Each link opens a single property.',
    linkShapeLabel: 'What a link looks like',
    troubleshoot:
      "If the link your agent sent isn't opening, it may have expired, the agent may have disabled it, or it may have reached its view limit. Ask the agent for a new one.",
    visitWebsite: 'Visit the Ghar website',
  },

  notFound: {
    title: 'Link not found',
    warning: 'This link is not valid, or it has expired.',
    hint: 'Please reopen the complete link your agent sent, or ask them for a new one.',
  },

  listing: {
    priceOnRequest: 'Price on request',
    linkNotice: 'This link',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    area: 'Area',
    call: 'Call',
    whatsapp: 'WhatsApp',
  },

  expired: {
    onceOnly: 'This link could only be opened once',
    revoked: 'The agent has disabled this link',
    generic: 'This link has expired',
    askForNew: 'Ask the agent for a new one',
  },

  language: 'Language',
};

const COPY: Record<Locale, Copy> = {
  [Locale.UR]: ur,
  [Locale.UR_LATN]: urLatn,
  [Locale.EN]: en,
};

export function copyFor(locale: Locale): Copy {
  return COPY[locale];
}

export type ShareCopy = Copy;

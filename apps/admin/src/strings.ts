import { Locale } from '@ghar/shared';

/**
 * Copy for the admin panel, in all three languages.
 *
 * Not i18next. This is a Server Component tree, and pulling a provider in to
 * serve strings would add a hydration boundary and a class of bugs for no
 * user-visible gain. A plain typed object does the job better: the
 * `Record<Locale, AdminStrings>` at the bottom makes a key added to Urdu and
 * forgotten in Roman Urdu a BUILD ERROR — a stronger guarantee than the
 * runtime parity check the mobile bundles rely on.
 *
 * Deliberately NOT named `t` — packages/i18n/scripts/check-parity.mjs greps
 * for `t('…')` across apps/admin and would report every key here as missing.
 */
const ur = {
  brand: 'گھر ایڈمن',
  panel: 'ایڈمن پینل',
  marketplace: 'گھر مارکیٹ پلیس',
  language: 'زبان',

  nav: {
    overview: 'جائزہ',
    payments: 'ادائیگی کی تصدیق',
    agents: 'ایجنٹس',
    listings: 'لسٹنگز',
    settings: 'ترتیبات',
    logout: 'لاگ آؤٹ',
  },

  overview: {
    title: 'ڈیش بورڈ کا جائزہ',
    subtitle: 'آج کی اہم معلومات اور سرگرمیاں',
    totalRevenue: 'کل آمدنی',
    pendingPayments: 'زیر التواء ادائیگیاں',
    activeAgents: 'فعال ایجنٹس',
    newListings: 'نئی لسٹنگز',
    last30Days: 'پچھلے 30 دن',
    seeAll: 'سب دیکھیں',
    recentActivity: 'حالیہ سرگرمی',
    agentName: 'ایجنٹ کا نام',
    amount: 'رقم',
    date: 'تاریخ',
    action: 'اقدام',
    approve: 'منظور',
    reject: 'مسترد',
    nothingPending: 'کوئی ادائیگی زیر التواء نہیں',
    newListingLogged: 'نئی پراپرٹی لسٹ کی گئی',
    newAgentLogged: 'نئے ایجنٹ نے رجسٹریشن مکمل کی',
    paymentApproved: 'ادائیگی منظور کر لی گئی',
  },

  agents: {
    title: 'ایجنٹس مینجمنٹ',
    subtitle: 'تمام رجسٹرڈ ایجنٹس کی فہرست اور تفصیلات',
    filter: 'فلٹر کریں',
    detail: 'ایجنٹ کی تفصیل',
    status: 'سٹیٹس',
    totalListings: 'کل لسٹنگز',
    revenue: 'ریونیو',
    rating: 'ریٹنگ',
    action: 'ایکشن',
    verified: 'ویریفائیڈ',
    unverified: 'غیر ویریفائیڈ',
    blocked: 'بلاک شدہ',
    independent: 'آزاد ایجنٹ',
    suspendedAccount: 'اکاؤنٹ معطل',
    verify: 'ویریفائی کریں',
    unverify: 'ویریفیکیشن ہٹائیں',
    suspend: 'اکاؤنٹ معطل کریں',
    reinstate: 'اکاؤنٹ بحال کریں',
    searchPlaceholder: 'نام، آفس یا نمبر سے تلاش کریں',
    all: 'سب',
    none: 'کوئی ایجنٹ نہیں ملا',
  },

  listings: {
    title: 'لسٹنگز کی نگرانی',
    subtitle: 'تمام پراپرٹی لسٹنگز کا نظم کریں، فلٹر کریں اور کارروائی کریں۔',
    allCities: 'تمام شہر',
    allPurposes: 'قسم (سب)',
    allTypes: 'کیٹیگری (سب)',
    sale: 'فروخت',
    rent: 'کرایہ',
    media: 'میڈیا',
    deactivate: 'غیر فعال',
    reactivate: 'دوبارہ فعال',
    review: 'جائزہ لیں',
    none: 'کوئی لسٹنگ نہیں ملی',
    views: 'ویوز',
  },

  status: {
    draft: 'ادھورا',
    pending_payment: 'ادائیگی باقی',
    active: 'فعال',
    sold: 'بک گیا',
    rented: 'کرائے پر',
    expired: 'میعاد ختم',
    archived: 'غیر فعال',
  },

  type: {
    house: 'گھر',
    flat: 'فلیٹ',
    plot: 'پلاٹ',
    shop: 'دکان',
    office: 'دفتر',
    warehouse: 'گودام',
  },

  reports: {
    title: 'رپورٹس اور اینالیٹکس',
    subtitle: 'آپ کے پلیٹ فارم کی کارکردگی کا جامع جائزہ',
    revenueGrowth: 'آمدنی میں اضافہ',
    lastMonths: 'گزشتہ {months} ماہ',
    subscriptionPlans: 'سبسکرپشن پلانز',
    listingsByCity: 'شہر کے لحاظ سے لسٹنگز',
    topAgents: 'بہترین کارکردگی والے ایجنٹس',
    totalSales: 'کل سیلز',
    totalRevenue: 'مجموعی آمدنی',
    months3: '3 ماہ',
    months6: '6 ماہ',
    months12: '12 ماہ',
    noData: 'ابھی کوئی معلومات نہیں',
  },

  plan: {
    basic: 'بیسک پلان',
    premium: 'پریمیم پلان',
  },

  login: {
    title: 'ایڈمن لاگ اِن',
    sessionExpired: 'آپ کا سیشن ختم ہو گیا۔ دوبارہ لاگ اِن کریں۔',
    phoneLabel: 'موبائل نمبر',
    sending: 'بھیجا جا رہا ہے…',
    sendCode: 'کوڈ بھیجیں',
    codeLabel: 'چھ ہندسوں کا کوڈ',
    devCode: 'ڈیو موڈ کوڈ:',
    verifying: 'تصدیق ہو رہی ہے…',
    submit: 'لاگ اِن',
    changeNumber: 'نمبر تبدیل کریں',
    errors: {
      api_unreachable: 'سرور سے رابطہ نہیں ہو سکا۔ ہو سکتا ہے API ابھی بند ہو۔',
      invalid_pk_mobile_number: 'موبائل نمبر درست نہیں۔ مثال: 03009999999',
      otp_cooldown: 'نیا کوڈ بھیجنے کے لیے تھوڑا انتظار کریں۔',
      otp_invalid: 'کوڈ درست نہیں یا اس کی مدت ختم ہو چکی ہے۔',
      otp_request_failed: 'کوڈ نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔',
      not_admin: 'یہ اکاؤنٹ ایڈمن نہیں ہے۔',
    },
  },

  payments: {
    title: 'ادائیگی کی تصدیق',
    nothingWaiting: 'کوئی ادائیگی زیر التواء نہیں۔',
    awaitingDecision: '{count} ادائیگیاں فیصلے کی منتظر، پرانی پہلے۔',
    agent: 'ایجنٹ',
    agentPhone: 'ایجنٹ کا نمبر',
    paidFrom: 'کس نمبر سے بھیجا',
    transactionId: 'ٹرانزیکشن نمبر',
    submitted: 'بھیجا گیا',
    amountMismatch: 'رقم بل سے مختلف ہے: ایجنٹ کے مطابق {claimed}، بل {expected} کا ہے۔',
    provisionalLeft: 'ایجنٹ کو مزید {minutes} منٹ عارضی رسائی حاصل ہے۔',
    provisionalExpired: 'عارضی رسائی ختم — یہ ایجنٹ اس وقت بلاک ہے۔',
    noReceipt: 'رسید نہیں لگائی گئی۔',
    receiptAlt: 'ادائیگی کی رسید',
    approve: 'منظور کریں',
    rejectEllipsis: 'مسترد کریں…',
    confirmRejection: 'مسترد کرنے کی تصدیق',
    cancel: 'منسوخ',
    working: 'انتظار کریں…',
    chooseReason: '— وجہ منتخب کریں —',
    rejectReasons: [
      'رقم کم بھیجی گئی',
      'ٹرانزیکشن نمبر نہیں ملا',
      'رسید صاف نہیں ہے',
      'یہ ادائیگی پہلے شمار ہو چکی ہے',
    ],
  },

  error: {
    title: 'ڈیٹا لوڈ نہیں ہو سکا',
    body: 'سرور سے رابطہ نہیں ہو سکا۔ عام طور پر اس کی وجہ یہ ہوتی ہے کہ API ابھی بند ہے یا نیند میں ہے۔',
    hint: 'پہلی درخواست میں کچھ سیکنڈ لگ سکتے ہیں۔ دوبارہ کوشش کریں۔',
    retry: 'دوبارہ کوشش کریں',
  },

  priceOnRequest: 'قیمت: رابطہ کریں',
};

/**
 * NOT `as const`. With it, `typeof ur` is a wall of literal types and the
 * Roman Urdu dictionary cannot compile against it. Inferring `string` keeps
 * the half of the check that matters: same keys, same shape, all three.
 */
export type AdminStrings = typeof ur;

const urLatn: AdminStrings = {
  brand: 'Ghar Admin',
  panel: 'Admin Panel',
  marketplace: 'Ghar Marketplace',
  language: 'Zaban',

  nav: {
    overview: 'Jaiza',
    payments: 'Adaigi ki tasdeeq',
    agents: 'Agents',
    listings: 'Listings',
    settings: 'Tarteebat',
    logout: 'Log out',
  },

  overview: {
    title: 'Dashboard ka jaiza',
    subtitle: 'Aaj ki aham maloomat aur sargarmiyan',
    totalRevenue: 'Kul aamdani',
    pendingPayments: 'Zer-e-iltawa adaigiyan',
    activeAgents: 'Faal agents',
    newListings: 'Nayi listings',
    last30Days: 'Pichlay 30 din',
    seeAll: 'Sab dekhein',
    recentActivity: 'Haliya sargarmi',
    agentName: 'Agent ka naam',
    amount: 'Raqam',
    date: 'Tareekh',
    action: 'Iqdaam',
    approve: 'Manzoor',
    reject: 'Mustarad',
    nothingPending: 'Koi adaigi zer-e-iltawa nahi',
    newListingLogged: 'Nayi property list ki gayi',
    newAgentLogged: 'Naye agent ne registration mukammal ki',
    paymentApproved: 'Adaigi manzoor kar li gayi',
  },

  agents: {
    title: 'Agents management',
    subtitle: 'Tamam registered agents ki fehrist aur tafseelat',
    filter: 'Filter karein',
    detail: 'Agent ki tafseel',
    status: 'Status',
    totalListings: 'Kul listings',
    revenue: 'Revenue',
    rating: 'Rating',
    action: 'Action',
    verified: 'Verified',
    unverified: 'Ghair verified',
    blocked: 'Block shuda',
    independent: 'Azad agent',
    suspendedAccount: 'Account muattal',
    verify: 'Verify karein',
    unverify: 'Verification hatayein',
    suspend: 'Account muattal karein',
    reinstate: 'Account bahaal karein',
    searchPlaceholder: 'Naam, office ya number se talash karein',
    all: 'Sab',
    none: 'Koi agent nahi mila',
  },

  listings: {
    title: 'Listings ki nigrani',
    subtitle: 'Tamam property listings ka nazm karein, filter karein aur karrwai karein.',
    allCities: 'Tamam sheher',
    allPurposes: 'Qism (sab)',
    allTypes: 'Category (sab)',
    sale: 'Farokht',
    rent: 'Kiraya',
    media: 'Media',
    deactivate: 'Ghair faal',
    reactivate: 'Dobara faal',
    review: 'Jaiza lein',
    none: 'Koi listing nahi mili',
    views: 'Views',
  },

  status: {
    draft: 'Adhoora',
    pending_payment: 'Adaigi baqi',
    active: 'Faal',
    sold: 'Bik gaya',
    rented: 'Kiraye par',
    expired: 'Miyaad khatam',
    archived: 'Ghair faal',
  },

  type: {
    house: 'Ghar',
    flat: 'Flat',
    plot: 'Plot',
    shop: 'Dukan',
    office: 'Daftar',
    warehouse: 'Godam',
  },

  reports: {
    title: 'Reports aur analytics',
    subtitle: 'Aap ke platform ki karkardagi ka jaame jaiza',
    revenueGrowth: 'Aamdani mein izafa',
    lastMonths: 'Guzishta {months} maah',
    subscriptionPlans: 'Subscription plans',
    listingsByCity: 'Sheher ke lehaaz se listings',
    topAgents: 'Behtareen karkardagi walay agents',
    totalSales: 'Kul sales',
    totalRevenue: 'Majmooi aamdani',
    months3: '3 maah',
    months6: '6 maah',
    months12: '12 maah',
    noData: 'Abhi koi maloomat nahi',
  },

  plan: {
    basic: 'Basic plan',
    premium: 'Premium plan',
  },

  login: {
    title: 'Admin log in',
    sessionExpired: 'Aap ka session khatam ho gaya. Dobara log in karein.',
    phoneLabel: 'Mobile number',
    sending: 'Bheja ja raha hai…',
    sendCode: 'Code bhejein',
    codeLabel: 'Chhe hindson ka code',
    devCode: 'Dev mode code:',
    verifying: 'Tasdeeq ho rahi hai…',
    submit: 'Log in',
    changeNumber: 'Number tabdeel karein',
    errors: {
      api_unreachable: 'Server se rabta nahi ho saka. Ho sakta hai API abhi band ho.',
      invalid_pk_mobile_number: 'Mobile number durust nahi. Misal: 03009999999',
      otp_cooldown: 'Naya code bhejne ke liye thora intezar karein.',
      otp_invalid: 'Code durust nahi ya is ki muddat khatam ho chuki hai.',
      otp_request_failed: 'Code nahi bheja ja saka. Dobara koshish karein.',
      not_admin: 'Yeh account admin nahi hai.',
    },
  },

  payments: {
    title: 'Adaigi ki tasdeeq',
    nothingWaiting: 'Koi adaigi zer-e-iltawa nahi.',
    awaitingDecision: '{count} adaigiyan faislay ki muntazir, purani pehlay.',
    agent: 'Agent',
    agentPhone: 'Agent ka number',
    paidFrom: 'Kis number se bheja',
    transactionId: 'Transaction number',
    submitted: 'Bheja gaya',
    amountMismatch: 'Raqam bill se mukhtalif hai: agent ke mutabiq {claimed}, bill {expected} ka hai.',
    provisionalLeft: 'Agent ko mazeed {minutes} minute arzi rasai haasil hai.',
    provisionalExpired: 'Arzi rasai khatam — yeh agent is waqt block hai.',
    noReceipt: 'Raseed nahi lagayi gayi.',
    receiptAlt: 'Adaigi ki raseed',
    approve: 'Manzoor karein',
    rejectEllipsis: 'Mustarad karein…',
    confirmRejection: 'Mustarad karne ki tasdeeq',
    cancel: 'Mansookh',
    working: 'Intezar karein…',
    chooseReason: '— Wajah muntakhib karein —',
    rejectReasons: [
      'Raqam kam bheji gayi',
      'Transaction number nahi mila',
      'Raseed saaf nahi hai',
      'Yeh adaigi pehlay shumaar ho chuki hai',
    ],
  },

  error: {
    title: 'Data load nahi ho saka',
    body: 'Server se rabta nahi ho saka. Aam tor par is ki wajah yeh hoti hai ke API abhi band hai ya neend mein hai.',
    hint: 'Pehli darkhwast mein kuch second lag saktay hain. Dobara koshish karein.',
    retry: 'Dobara koshish karein',
  },

  priceOnRequest: 'Qeemat: rabta karein',
};

const en: AdminStrings = {
  brand: 'Ghar Admin',
  panel: 'Admin panel',
  marketplace: 'Ghar Marketplace',
  language: 'Language',

  nav: {
    overview: 'Overview',
    payments: 'Payment verification',
    agents: 'Agents',
    listings: 'Listings',
    settings: 'Settings',
    logout: 'Log out',
  },

  overview: {
    title: 'Dashboard overview',
    subtitle: "Today's key numbers and activity",
    totalRevenue: 'Total revenue',
    pendingPayments: 'Pending payments',
    activeAgents: 'Active agents',
    newListings: 'New listings',
    last30Days: 'Last 30 days',
    seeAll: 'See all',
    recentActivity: 'Recent activity',
    agentName: 'Agent',
    amount: 'Amount',
    date: 'Date',
    action: 'Action',
    approve: 'Approve',
    reject: 'Reject',
    nothingPending: 'No payments pending',
    newListingLogged: 'New property listed',
    newAgentLogged: 'New agent completed registration',
    paymentApproved: 'Payment approved',
  },

  agents: {
    title: 'Agent management',
    subtitle: 'Every registered agent, with their details',
    filter: 'Filter',
    detail: 'Agent',
    status: 'Status',
    totalListings: 'Listings',
    revenue: 'Revenue',
    rating: 'Rating',
    action: 'Action',
    verified: 'Verified',
    unverified: 'Unverified',
    blocked: 'Blocked',
    independent: 'Independent agent',
    suspendedAccount: 'Account suspended',
    verify: 'Verify',
    unverify: 'Remove verification',
    suspend: 'Suspend account',
    reinstate: 'Reinstate account',
    searchPlaceholder: 'Search by name, agency or number',
    all: 'All',
    none: 'No agents found',
  },

  listings: {
    title: 'Listing moderation',
    subtitle: 'Review, filter and act on every property listing.',
    allCities: 'All cities',
    allPurposes: 'Purpose (all)',
    allTypes: 'Category (all)',
    sale: 'Sale',
    rent: 'Rent',
    media: 'Media',
    deactivate: 'Deactivate',
    reactivate: 'Reactivate',
    review: 'Review',
    none: 'No listings found',
    views: 'Views',
  },

  status: {
    draft: 'Draft',
    pending_payment: 'Payment due',
    active: 'Active',
    sold: 'Sold',
    rented: 'Rented',
    expired: 'Expired',
    archived: 'Archived',
  },

  type: {
    house: 'House',
    flat: 'Flat',
    plot: 'Plot',
    shop: 'Shop',
    office: 'Office',
    warehouse: 'Warehouse',
  },

  reports: {
    title: 'Reports and analytics',
    subtitle: 'How the platform is performing',
    revenueGrowth: 'Revenue growth',
    lastMonths: 'Last {months} months',
    subscriptionPlans: 'Subscription plans',
    listingsByCity: 'Listings by city',
    topAgents: 'Top performing agents',
    totalSales: 'Total sales',
    totalRevenue: 'Total revenue',
    months3: '3 months',
    months6: '6 months',
    months12: '12 months',
    noData: 'No data yet',
  },

  plan: {
    basic: 'Basic plan',
    premium: 'Premium plan',
  },

  login: {
    title: 'Admin log in',
    sessionExpired: 'Your session expired. Please log in again.',
    phoneLabel: 'Mobile number',
    sending: 'Sending…',
    sendCode: 'Send code',
    codeLabel: 'Six-digit code',
    devCode: 'Dev mode code:',
    verifying: 'Verifying…',
    submit: 'Log in',
    changeNumber: 'Change number',
    errors: {
      api_unreachable: "Couldn't reach the server. The API may be down.",
      invalid_pk_mobile_number: "That number doesn't look right. Example: 03009999999",
      otp_cooldown: 'Wait a moment before requesting another code.',
      otp_invalid: 'That code is wrong or has expired.',
      otp_request_failed: "Couldn't send the code. Try again.",
      not_admin: 'This account is not an admin.',
    },
  },

  payments: {
    title: 'Payment verification',
    nothingWaiting: 'Nothing waiting.',
    awaitingDecision: '{count} awaiting a decision, oldest first.',
    agent: 'Agent',
    agentPhone: 'Agent phone',
    paidFrom: 'Paid from',
    transactionId: 'Transaction ID',
    submitted: 'Submitted',
    amountMismatch: 'Amount does not match the invoice: agent claims {claimed}, invoice is {expected}.',
    provisionalLeft: 'Agent is provisionally unblocked for another {minutes} min.',
    provisionalExpired: 'Provisional access has expired — this agent is currently blocked.',
    noReceipt: 'No receipt uploaded.',
    receiptAlt: 'Payment receipt',
    approve: 'Approve',
    rejectEllipsis: 'Reject…',
    confirmRejection: 'Confirm rejection',
    cancel: 'Cancel',
    working: 'Working…',
    chooseReason: '— Choose a reason —',
    rejectReasons: [
      'Amount sent was short',
      'Transaction ID not found',
      'Receipt is not legible',
      'This payment was already counted',
    ],
  },

  error: {
    title: "Couldn't load the data",
    body: "Couldn't reach the server. Usually this means the API is down or asleep.",
    hint: 'The first request can take a few seconds. Try again.',
    retry: 'Try again',
  },

  priceOnRequest: 'Price on request',
};

const STRINGS: Record<Locale, AdminStrings> = {
  [Locale.UR]: ur,
  [Locale.UR_LATN]: urLatn,
  [Locale.EN]: en,
};

export function stringsFor(locale: Locale): AdminStrings {
  return STRINGS[locale];
}

/**
 * The Urdu set, for the two places a per-request locale is genuinely
 * unavailable: `metadata` (generated once, not per request) and module-scope
 * constants. Everything rendered inside a request should call `stringsFor`.
 */
export const S = ur;

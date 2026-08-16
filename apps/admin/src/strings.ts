/**
 * Urdu labels for the admin panel.
 *
 * Not i18next: the panel is an internal, single-locale tool and the Stitch
 * design is Urdu throughout (`ایڈمن پینل`). Pulling i18next into React Server
 * Components to serve one language would add a provider, a hydration boundary
 * and a whole class of bugs for no user-visible gain.
 *
 * Deliberately NOT named `t` — packages/i18n/scripts/check-usage.mjs greps for
 * `t('…')` across apps/admin and would report every key here as missing.
 */
export const S = {
  brand: 'گھر ایڈمن',
  panel: 'ایڈمن پینل',
  marketplace: 'گھر مارکیٹ پلیس',

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

  priceOnRequest: 'قیمت: رابطہ کریں',
} as const;

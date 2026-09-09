import { Locale } from '@ghar/shared';

/**
 * Marketing copy, in all three languages.
 *
 * A typed strings module rather than i18next, for the same reason as the admin
 * panel: these are React Server Components, and an i18n runtime would add a
 * hydration boundary for no gain. The `Record<Locale, WebCopy>` at the bottom
 * is what makes a key added to Urdu and forgotten in Roman Urdu a BUILD ERROR.
 *
 * The earlier note here said an English site should be a separate locale route
 * rather than a toggle, because the page is indexed and must render its
 * language server-side. The second half of that is right and is preserved:
 * this switches on a cookie read on the SERVER, so the HTML that arrives is
 * already in the chosen language. Nothing here is client-side.
 *
 * Deliberately NOT named `t` — packages/i18n/scripts/check-usage.mjs greps for
 * `t('…')` across apps/web and would report every key here as missing.
 */
const ur = {
  brand: 'گھر',
  tagline: 'پاکستان کا سب سے بڑا اور قابل اعتماد ویڈیو بیسڈ پراپرٹی نیٹ ورک۔',

  nav: {
    home: 'ہوم',
    agents: 'ایجنٹس کے لیے',
    buyers: 'خریداروں کے لیے',
    pricing: 'قیمتیں',
    contact: 'رابطہ کریں',
    download: 'ایپ ڈاؤن لوڈ کریں',
  },

  home: {
    heroLine1: 'پاکستان کا پہلا',
    heroHighlight: 'ویڈیو پر مبنی',
    heroLine2: 'پراپرٹی مارکیٹ پلیس',
    heroSub: 'گھر کے ساتھ پراپرٹی کی خرید و فروخت اب اور بھی آسان اور شفاف',
    seeListings: 'لسٹنگز دیکھیں',

    buyersTitle: 'خریداروں کے لیے گھر کیوں؟',
    buyersSub: 'جدید ٹیکنالوجی اور شفافیت کے ساتھ اپنے خوابوں کا گھر تلاش کریں',
    videoTours: 'ویڈیو ٹورز',
    videoToursBody:
      'ہر پراپرٹی کا تفصیلی ویڈیو ٹور، گھر بیٹھے مکمل جائزہ لیں تاکہ آپ بہتر فیصلہ کر سکیں',
    verifiedAgents: 'تصدیق شدہ ایجنٹس',
    verifiedAgentsBody: 'صرف مستند اور تصدیق شدہ پراپرٹی ایجنٹس، دھوکہ دہی سے پاک محفوظ لین دین',
    directContact: 'براہِ راست رابطہ',
    directContactBody: 'ایجنٹ یا مالک سے براہ راست واٹس ایپ یا کال کے ذریعے فوری رابطہ کریں',
    voiceSearch: 'آواز سے تلاش کریں',
    voiceSearchBody: 'لکھنے کی ضرورت نہیں — بس بولیں اور اپنی پسند کی پراپرٹی تلاش کریں',

    agentsTitle: 'ایجنٹس کے لیے بہترین پلیٹ فارم',
    agentsSub:
      'اپنے رئیل اسٹیٹ بزنس کو ڈیجیٹل بنائیں اور گھر کے جدید ڈیش بورڈ کے ساتھ اپنا کام آسان کریں۔',
    premiumLeads: 'پریمیم لیڈز',
    premiumLeadsBody: 'تصدیق شدہ اور سنجیدہ خریداروں تک رسائی',
    analytics: 'اینالیٹکس',
    analyticsBody: 'اپنی لسٹنگز کی کارکردگی کا تفصیلی جائزہ',
    fasterSales: 'تیز ترین فروخت',
    fasterSalesBody: 'ویڈیو ٹورز کے ذریعے پراپرٹی جلدی فروخت کریں',
    registerAsAgent: 'بطور ایجنٹ رجسٹر ہوں',

    downloadTitle: 'گھر ایپ آج ہی ڈاؤن لوڈ کریں',
    downloadBody:
      'بہترین پراپرٹی ڈیلز، ویڈیو ٹورز اور براہِ راست رابطے کے لیے ہماری موبائل ایپ استعمال کریں۔',
  },

  buyers: {
    heroLine1: 'اپنا خوابوں کا گھر تلاش کریں،',
    heroLine2: 'مکمل اعتماد کے ساتھ',
    searchCta: 'تلاش کریں',

    videoFirstEyebrow: 'ویڈیو فرسٹ ٹیکنالوجی',
    videoFirstTitle: 'پہلے دیکھیں، پھر جائیں — پراپرٹی کا مکمل ویڈیو معائنہ',
    videoFirstBody:
      'گھر ایپ پر ہر پراپرٹی کے ساتھ ایک تفصیلی ویڈیو ٹور موجود ہے۔ اپنا وقت بچائیں اور ذاتی دورے سے پہلے گھر کے ہر کونے کا تفصیلی جائزہ لیں۔',
    saveTime: 'وقت کی بچت',
    saveTimeBody: 'غیر ضروری چکروں سے بچیں اور گھر بیٹھے شارٹ لسٹ کریں۔',
    realFootage: '100٪ اصلی مناظر',
    realFootageBody: 'ویڈیوز کو ایڈٹ نہیں کیا جاتا، جو آپ دیکھتے ہیں وہی آپ کو ملتا ہے۔',

    promiseTitle: 'ہمارا وعدہ: صرف تصدیق شدہ لسٹنگز',
    promiseBody:
      'پراپرٹی خریدنا ایک بڑا فیصلہ ہے۔ ہم اس بات کو یقینی بناتے ہیں کہ ہمارے پلیٹ فارم پر موجود ہر ایجنٹ ہمارے تصدیقی عمل سے گزرے۔',
    verifiedAgentsBody:
      'ہمارے نیٹ ورک میں شامل ہونے سے پہلے تمام ایجنٹس کی شناخت اور رابطہ نمبر کی تصدیق کی جاتی ہے۔',
    privacyTitle: 'آپ کی نجی معلومات محفوظ',
    privacyBody:
      'آپ کا نام اور نمبر ایجنٹ کو صرف اسی وقت ملتا ہے جب آپ خود اس سے رابطہ کریں۔ ہم آپ کا ڈیٹا کسی کو نہیں بیچتے۔',

    howTitle: 'گھر خریدنے کا آسان طریقہ',
    step1: 'تلاش کریں',
    step1Body: 'اپنے بجٹ اور ضرورت کے مطابق پراپرٹی ڈھونڈیں — لکھ کر یا بول کر۔',
    step2: 'ویڈیو دیکھیں',
    step2Body: 'پراپرٹی کا تفصیلی ویڈیو ٹور دیکھیں اور ہر کمرے کا جائزہ لیں۔',
    step3: 'ایجنٹ سے ملیں',
    step3Body: 'تصدیق شدہ ایجنٹ سے رابطہ کریں اور پراپرٹی کا دورہ طے کریں۔',
    step4: 'محفوظ خریداری',
    step4Body: 'کاغذات مکمل کریں اور اپنے نئے گھر کی چابی حاصل کریں۔',
  },

  agents: {
    heroTitle: 'اپنے رئیل اسٹیٹ بزنس کو نئی بلندیوں پر لے جائیں',
    heroSub: 'گھر کے ٹولز کے ساتھ اپنی لسٹنگز زیادہ خریداروں تک پہنچائیں',
    toolsTitle: 'ہمارے ٹولز',
    premiumListings: 'نمایاں لسٹنگز',
    premiumListingsBody: 'اپنی پراپرٹیز کو تلاش میں سب سے اوپر رکھیں اور زیادہ خریداروں تک پہنچیں۔',
    dashboardAnalytics: 'ڈیش بورڈ اینالیٹکس',
    dashboardAnalyticsBody: 'اپنی کارکردگی ٹریک کریں اور معلومات کی بنیاد پر فیصلے کریں۔',
    demandInsights: 'مارکیٹ کی مانگ',
    demandInsightsBody: 'اپنے علاقے میں خریداروں کی دلچسپی کا اندازہ لگائیں — صرف اعداد، کوئی ذاتی معلومات نہیں۔',
    voiceListing: 'بول کر اشتہار',
    voiceListingBody: 'تفصیل لکھنے کے بجائے بول کر بتائیں، ایپ خود لکھ لے گی۔',
    joinTitle: 'آج ہی گھر کے ساتھ شامل ہوں',
  },

  plan: {
    basic: 'عام پلان (Basic)',
    premium: 'پریمیم پلان (Premium)',
  },

  pricing: {
    title: 'شفاف قیمتیں، کوئی پوشیدہ چارجز نہیں',
    subtitle: 'اپنی ضرورت کے مطابق پلان منتخب کریں۔ ہر پلان ایجنٹس کی کامیابی کے لیے بنایا گیا ہے۔',
    perMonth: '/ ماہ',
    mostPopular: 'سب سے مقبول',
    choose: 'منتخب کریں',
    start: 'شروع کریں',
    basicFor: 'نئے اور چھوٹے ایجنٹس کے لیے',
    premiumFor: 'مصروف ایجنٹس اور ایجنسیوں کے لیے',
    includedListings: '{count} پراپرٹی لسٹنگز مفت',
    unlimitedListings: 'لامحدود لسٹنگز',
    extraFee: 'اس کے بعد ہر لسٹنگ {price} (ایک بار)',
    noExtraFee: 'کوئی اضافی لسٹنگ فیس نہیں',
    support: 'معیاری کسٹمر سپورٹ',
    prioritySupport: 'فوری مدد',
    featuredBadge: 'تصدیق شدہ نشان',
    topPlacement: 'تلاش میں سب سے اوپر',
    insights: 'گاہکوں کی معلومات',
    breakEvenNote: '{count} لسٹنگز سے آگے پریمیم عام پلان سے سستا پڑتا ہے۔',
    honestNote:
      'ہم قیمت کا حساب آپ کے اصل استعمال پر کرتے ہیں۔ اگر عام پلان آپ کے لیے بہتر ہے تو ایپ آپ کو یہی بتائے گی۔',
  },

  contact: {
    title: 'ہم سے رابطہ کریں',
    subtitle:
      'کسی بھی سوال، رہنمائی یا تاثرات کے لیے ہماری ٹیم سے رابطہ کریں۔ ہم آپ کی مدد کے لیے تیار ہیں۔',
    sendMessage: 'پیغام بھیجیں',
    name: 'نام',
    email: 'ای میل',
    phone: 'فون نمبر',
    message: 'پیغام',
    sent: 'شکریہ! آپ کا پیغام موصول ہو گیا۔ ہم جلد رابطہ کریں گے۔',
    failed: 'پیغام نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔',
    required: 'براہِ کرم نام اور پیغام ضرور لکھیں۔',
    headOffice: 'ہیڈ آفس',
    address: 'بلیو ایریا، اسلام آباد، پاکستان',
    phoneAndEmail: 'فون اور ای میل',
    faqTitle: 'عمومی سوالات',
    faq1Q: 'اکاؤنٹ کی تصدیق کیسے کریں؟',
    faq1A: 'ایپ میں اپنے اکاؤنٹ کے صفحے پر جائیں اور تصدیق کا مرحلہ مکمل کریں۔ تصدیق کے بعد آپ کے اشتہار پر تصدیق شدہ نشان لگ جائے گا۔',
    faq2Q: 'اپنی پراپرٹی کیسے لسٹ کریں؟',
    faq2A: 'ایپ میں "اشتہار دیں" پر جائیں اور مرحلہ وار تفصیل بھریں۔ لکھنے کے بجائے بول کر بھی تفصیل بتائی جا سکتی ہے۔',
    faq3Q: 'کیا میرا نمبر سب کو نظر آتا ہے؟',
    faq3A: 'نہیں۔ ایجنٹ کا نمبر تلاش کے نتائج یا پروفائل پر نہیں دکھایا جاتا — یہ صرف اسی وقت ملتا ہے جب کوئی گاہک خود رابطہ کرے۔',
  },

  footer: {
    links: 'روابط',
    about: 'ہمارے بارے میں',
    privacy: 'پرائیویسی پالیسی',
    terms: 'شرائط و ضوابط',
    help: 'مدد مرکز',
    rights: '© ۲۰۲۶ گھر پراپرٹی مارکیٹ پلیس۔ جملہ حقوق محفوظ ہیں۔',
  },

  language: 'زبان',
};

/**
 * NOT `as const`. With it, `typeof ur` is a wall of literal types and neither
 * of the other locales can satisfy it. Inferring `string` keeps what matters:
 * same keys, same shape, all three languages.
 */
export type WebCopy = typeof ur;

const urLatn: WebCopy = {
  brand: 'Ghar',
  tagline: 'Pakistan ka sab se bara aur qabil-e-aitmaad video based property network.',

  nav: {
    home: 'Home',
    agents: 'Agents ke liye',
    buyers: 'Kharidaron ke liye',
    pricing: 'Qeematein',
    contact: 'Rabta karein',
    download: 'App download karein',
  },

  home: {
    heroLine1: 'Pakistan ka pehla',
    heroHighlight: 'video par mabni',
    heroLine2: 'property marketplace',
    heroSub: 'Ghar ke sath property ki kharid o farokht ab aur bhi aasan aur shaffaf',
    seeListings: 'Listings dekhein',

    buyersTitle: 'Kharidaron ke liye Ghar kyun?',
    buyersSub: 'Jadeed technology aur shaffafiyat ke sath apnay khwabon ka ghar talash karein',
    videoTours: 'Video tours',
    videoToursBody:
      'Har property ka tafseeli video tour, ghar baithay mukammal jaiza lein taake aap behtar faisla kar sakein',
    verifiedAgents: 'Tasdeeq shuda agents',
    verifiedAgentsBody:
      'Sirf mustanad aur tasdeeq shuda property agents, dhoka dahi se paak mehfooz len den',
    directContact: 'Barah-e-raast rabta',
    directContactBody:
      'Agent ya maalik se barah-e-raast WhatsApp ya call ke zariye fori rabta karein',
    voiceSearch: 'Awaz se talash karein',
    voiceSearchBody: 'Likhne ki zaroorat nahi — bas bolein aur apni pasand ki property talash karein',

    agentsTitle: 'Agents ke liye behtareen platform',
    agentsSub:
      'Apnay real estate business ko digital banayein aur Ghar ke jadeed dashboard ke sath apna kaam aasan karein.',
    premiumLeads: 'Premium leads',
    premiumLeadsBody: 'Tasdeeq shuda aur sanjeeda kharidaron tak rasai',
    analytics: 'Analytics',
    analyticsBody: 'Apni listings ki karkardagi ka tafseeli jaiza',
    fasterSales: 'Tez tareen farokht',
    fasterSalesBody: 'Video tours ke zariye property jaldi farokht karein',
    registerAsAgent: 'Bator agent register hon',

    downloadTitle: 'Ghar app aaj hi download karein',
    downloadBody:
      'Behtareen property deals, video tours aur barah-e-raast raabtay ke liye hamari mobile app istemal karein.',
  },

  buyers: {
    heroLine1: 'Apna khwabon ka ghar talash karein,',
    heroLine2: 'mukammal aitmaad ke sath',
    searchCta: 'Talash karein',

    videoFirstEyebrow: 'Video-first technology',
    videoFirstTitle: 'Pehlay dekhein, phir jayein — property ka mukammal video muaina',
    videoFirstBody:
      'Ghar app par har property ke sath aik tafseeli video tour mojood hai. Apna waqt bachayein aur zaati dauray se pehlay ghar ke har konay ka tafseeli jaiza lein.',
    saveTime: 'Waqt ki bachat',
    saveTimeBody: 'Ghair zaroori chakron se bachein aur ghar baithay shortlist karein.',
    realFootage: '100% asli manazir',
    realFootageBody: 'Videos ko edit nahi kiya jata, jo aap dekhtay hain wohi aap ko milta hai.',

    promiseTitle: 'Hamara wada: sirf tasdeeq shuda listings',
    promiseBody:
      'Property kharidna aik bara faisla hai. Hum is baat ko yaqeeni banatay hain ke hamaray platform par mojood har agent hamaray tasdeeqi amal se guzray.',
    verifiedAgentsBody:
      'Hamaray network mein shamil honay se pehlay tamam agents ki shanakht aur rabta number ki tasdeeq ki jati hai.',
    privacyTitle: 'Aap ki niji maloomat mehfooz',
    privacyBody:
      'Aap ka naam aur number agent ko sirf usi waqt milta hai jab aap khud us se rabta karein. Hum aap ka data kisi ko nahi bechtay.',

    howTitle: 'Ghar kharidne ka aasan tareeqa',
    step1: 'Talash karein',
    step1Body: 'Apnay budget aur zaroorat ke mutabiq property dhoondein — likh kar ya bol kar.',
    step2: 'Video dekhein',
    step2Body: 'Property ka tafseeli video tour dekhein aur har kamray ka jaiza lein.',
    step3: 'Agent se milein',
    step3Body: 'Tasdeeq shuda agent se rabta karein aur property ka daura tay karein.',
    step4: 'Mehfooz kharidari',
    step4Body: 'Kaghzaat mukammal karein aur apnay naye ghar ki chaabi haasil karein.',
  },

  agents: {
    heroTitle: 'Apnay real estate business ko nayi bulandiyon par le jayein',
    heroSub: 'Ghar ke tools ke sath apni listings ziyada kharidaron tak pohnchayein',
    toolsTitle: 'Hamaray tools',
    premiumListings: 'Numayan listings',
    premiumListingsBody:
      'Apni properties ko talash mein sab se ooper rakhein aur ziyada kharidaron tak pohnchein.',
    dashboardAnalytics: 'Dashboard analytics',
    dashboardAnalyticsBody: 'Apni karkardagi track karein aur maloomat ki bunyad par faislay karein.',
    demandInsights: 'Market ki maang',
    demandInsightsBody:
      'Apnay ilaqay mein kharidaron ki dilchaspi ka andaza lagayein — sirf aadad, koi zaati maloomat nahi.',
    voiceListing: 'Bol kar ishtihaar',
    voiceListingBody: 'Tafseel likhne ke bajaye bol kar batayein, app khud likh le gi.',
    joinTitle: 'Aaj hi Ghar ke sath shamil hon',
  },

  plan: {
    basic: 'Aam plan (Basic)',
    premium: 'Premium plan',
  },

  pricing: {
    title: 'Shaffaf qeematein, koi posheeda charges nahi',
    subtitle:
      'Apni zaroorat ke mutabiq plan muntakhib karein. Har plan agents ki kamyabi ke liye banaya gaya hai.',
    perMonth: '/ maah',
    mostPopular: 'Sab se maqbool',
    choose: 'Muntakhib karein',
    start: 'Shuru karein',
    basicFor: 'Naye aur chhotay agents ke liye',
    premiumFor: 'Masroof agents aur agencies ke liye',
    includedListings: '{count} property listings muft',
    unlimitedListings: 'Lamehdood listings',
    extraFee: 'Is ke baad har listing {price} (aik baar)',
    noExtraFee: 'Koi izafi listing fees nahi',
    support: 'Miyari customer support',
    prioritySupport: 'Fori madad',
    featuredBadge: 'Tasdeeq shuda nishan',
    topPlacement: 'Talash mein sab se ooper',
    insights: 'Grahakon ki maloomat',
    breakEvenNote: '{count} listings se aagay Premium aam plan se sasta parta hai.',
    honestNote:
      'Hum qeemat ka hisaab aap ke asal istemal par kartay hain. Agar aam plan aap ke liye behtar hai to app aap ko yehi bataye gi.',
  },

  contact: {
    title: 'Hum se rabta karein',
    subtitle:
      'Kisi bhi sawal, rehnumai ya tassurat ke liye hamari team se rabta karein. Hum aap ki madad ke liye tayyar hain.',
    sendMessage: 'Paighaam bhejein',
    name: 'Naam',
    email: 'Email',
    phone: 'Phone number',
    message: 'Paighaam',
    sent: 'Shukriya! Aap ka paighaam mosool ho gaya. Hum jald rabta karein ge.',
    failed: 'Paighaam nahi bheja ja saka. Dobara koshish karein.',
    required: 'Barah-e-karam naam aur paighaam zaroor likhein.',
    headOffice: 'Head office',
    address: 'Blue Area, Islamabad, Pakistan',
    phoneAndEmail: 'Phone aur email',
    faqTitle: 'Umoomi sawalat',
    faq1Q: 'Account ki tasdeeq kaisay karein?',
    faq1A:
      'App mein apnay account ke safhay par jayein aur tasdeeq ka marhala mukammal karein. Tasdeeq ke baad aap ke ishtihaar par tasdeeq shuda nishan lag jaye ga.',
    faq2Q: 'Apni property kaisay list karein?',
    faq2A:
      'App mein "Ishtihaar dein" par jayein aur marhala waar tafseel bharein. Likhne ke bajaye bol kar bhi tafseel batayi ja sakti hai.',
    faq3Q: 'Kya mera number sab ko nazar aata hai?',
    faq3A:
      'Nahi. Agent ka number talash ke nataij ya profile par nahi dikhaya jata — yeh sirf usi waqt milta hai jab koi grahak khud rabta karay.',
  },

  footer: {
    links: 'Rawabit',
    about: 'Hamaray baray mein',
    privacy: 'Privacy policy',
    terms: 'Sharait o zawabit',
    help: 'Madad markaz',
    rights: '© 2026 Ghar Property Marketplace. Jumla huqooq mehfooz hain.',
  },

  language: 'Zaban',
};

const en: WebCopy = {
  brand: 'Ghar',
  tagline: "Pakistan's largest and most trusted video-based property network.",

  nav: {
    home: 'Home',
    agents: 'For agents',
    buyers: 'For buyers',
    pricing: 'Pricing',
    contact: 'Contact',
    download: 'Download the app',
  },

  home: {
    heroLine1: "Pakistan's first",
    heroHighlight: 'video-based',
    heroLine2: 'property marketplace',
    heroSub: 'Buying and selling property, made simpler and more transparent',
    seeListings: 'See listings',

    buyersTitle: 'Why buyers choose Ghar',
    buyersSub: 'Find the home you want, with the technology and transparency to be sure of it',
    videoTours: 'Video tours',
    videoToursBody:
      'Every property comes with a full video tour, so you can see all of it from home and decide better',
    verifiedAgents: 'Verified agents',
    verifiedAgentsBody: 'Only genuine, verified property agents — safe dealings, no fraud',
    directContact: 'Direct contact',
    directContactBody: 'Reach the agent or owner straight away, by WhatsApp or a call',
    voiceSearch: 'Search by voice',
    voiceSearchBody: 'No typing needed — just speak, and find the property you want',

    agentsTitle: 'The best platform for agents',
    agentsSub:
      'Take your real estate business digital, and run it from one modern dashboard.',
    premiumLeads: 'Premium leads',
    premiumLeadsBody: 'Reach verified, serious buyers',
    analytics: 'Analytics',
    analyticsBody: 'See exactly how your listings are performing',
    fasterSales: 'Faster sales',
    fasterSalesBody: 'Video tours sell property sooner',
    registerAsAgent: 'Register as an agent',

    downloadTitle: 'Download the Ghar app today',
    downloadBody:
      'The best property deals, video tours and direct contact — all in our mobile app.',
  },

  buyers: {
    heroLine1: 'Find the home you want,',
    heroLine2: 'and be sure of it',
    searchCta: 'Search',

    videoFirstEyebrow: 'Video-first technology',
    videoFirstTitle: 'See it before you go — a full video walkthrough of every property',
    videoFirstBody:
      'Every property on Ghar has a detailed video tour. Save yourself the trip and inspect every corner before you visit in person.',
    saveTime: 'Save time',
    saveTimeBody: 'Skip the wasted journeys and shortlist from home.',
    realFootage: '100% real footage',
    realFootageBody: "Videos are never edited. What you see is what you get.",

    promiseTitle: 'Our promise: verified listings only',
    promiseBody:
      'Buying a property is a big decision. Every agent on our platform goes through our verification process first.',
    verifiedAgentsBody:
      "Every agent's identity and contact number is verified before they join our network.",
    privacyTitle: 'Your details stay private',
    privacyBody:
      "An agent gets your name and number only when you contact them yourself. We don't sell your data to anyone.",

    howTitle: 'Buying a home, step by step',
    step1: 'Search',
    step1Body: 'Find properties that fit your budget and needs — by typing or by speaking.',
    step2: 'Watch the video',
    step2Body: 'Take the full video tour and see every room.',
    step3: 'Meet the agent',
    step3Body: 'Contact a verified agent and arrange a visit.',
    step4: 'Buy with confidence',
    step4Body: 'Complete the paperwork and collect the keys to your new home.',
  },

  agents: {
    heroTitle: 'Take your real estate business further',
    heroSub: "Get your listings in front of more buyers with Ghar's tools",
    toolsTitle: 'Our tools',
    premiumListings: 'Featured listings',
    premiumListingsBody: 'Put your properties at the top of search and reach more buyers.',
    dashboardAnalytics: 'Dashboard analytics',
    dashboardAnalyticsBody: 'Track your performance and decide on the numbers.',
    demandInsights: 'Market demand',
    demandInsightsBody:
      'Gauge buyer interest in your areas — counts only, never anyone’s personal details.',
    voiceListing: 'List by voice',
    voiceListingBody: 'Speak the description instead of typing it; the app writes it down.',
    joinTitle: 'Join Ghar today',
  },

  plan: {
    basic: 'Basic plan',
    premium: 'Premium plan',
  },

  pricing: {
    title: 'Transparent pricing, no hidden charges',
    subtitle: 'Pick the plan that fits. Both are built around what makes agents successful.',
    perMonth: '/ month',
    mostPopular: 'Most popular',
    choose: 'Choose',
    start: 'Get started',
    basicFor: 'For new and smaller agents',
    premiumFor: 'For busy agents and agencies',
    includedListings: '{count} property listings included',
    unlimitedListings: 'Unlimited listings',
    extraFee: 'Then {price} per listing (one-off)',
    noExtraFee: 'No extra listing fees',
    support: 'Standard customer support',
    prioritySupport: 'Priority support',
    featuredBadge: 'Verified badge',
    topPlacement: 'Top of search results',
    insights: 'Buyer demand insights',
    breakEvenNote: 'From {count} listings onward, Premium costs less than Basic.',
    honestNote:
      "We price on what you actually use. If Basic is the better deal for you, the app will tell you so.",
  },

  contact: {
    title: 'Get in touch',
    subtitle:
      "For any question, guidance or feedback, contact our team. We're here to help.",
    sendMessage: 'Send message',
    name: 'Name',
    email: 'Email',
    phone: 'Phone number',
    message: 'Message',
    sent: "Thank you — we've received your message and will be in touch soon.",
    failed: "Couldn't send the message. Please try again.",
    required: 'Please enter a name and a message.',
    headOffice: 'Head office',
    address: 'Blue Area, Islamabad, Pakistan',
    phoneAndEmail: 'Phone and email',
    faqTitle: 'Common questions',
    faq1Q: 'How do I verify my account?',
    faq1A:
      'Open your account page in the app and complete the verification step. Once verified, your listings carry the verified badge.',
    faq2Q: 'How do I list my property?',
    faq2A:
      'Tap "Post" in the app and fill in the steps. You can speak the description instead of typing it.',
    faq3Q: 'Is my number visible to everyone?',
    faq3A:
      "No. An agent's number is never shown in search results or on a profile — it is shared only when a customer contacts them.",
  },

  footer: {
    links: 'Links',
    about: 'About us',
    privacy: 'Privacy policy',
    terms: 'Terms and conditions',
    help: 'Help centre',
    rights: '© 2026 Ghar Property Marketplace. All rights reserved.',
  },

  language: 'Language',
};

const COPY: Record<Locale, WebCopy> = {
  [Locale.UR]: ur,
  [Locale.UR_LATN]: urLatn,
  [Locale.EN]: en,
};

export function copyFor(locale: Locale): WebCopy {
  return COPY[locale];
}

/**
 * The Urdu set, for `metadata` — generated once per build rather than per
 * request, so it cannot depend on a cookie. Everything rendered inside a
 * request should call `copyFor`.
 */
export const C = ur;

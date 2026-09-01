import { useSettingsStore } from '../store/settings.store';

/**
 * Lightweight i18n — English is the source of truth; Urdu translations
 * fall back to the English string when a key is missing. `t('Any text')`
 * returns the Urdu translation when the language is Urdu, otherwise the
 * input unchanged. RTL direction is handled globally via <html dir>.
 */

const UR = {
  // ── Navigation ──────────────────────────────────────────
  Dashboard: 'ڈیش بورڈ',
  Home: 'ہوم',
  'Report Emergency': 'ایمرجنسی رپورٹ',
  Report: 'رپورٹ',
  'Safety Map': 'حفاظتی نقشہ',
  Map: 'نقشہ',
  'My Reports': 'میری رپورٹس',
  Reports: 'رپورٹس',
  'Ask CIRO AI': 'سیرو AI سے پوچھیں',
  AI: 'AI',
  Weather: 'موسم',
  Alerts: 'الرٹس',
  'Safe Places': 'محفوظ مقامات',
  Profile: 'پروفائل',
  Assignments: 'اسائنمنٹس',
  Tasks: 'کام',
  History: 'تاریخ',
  Notifications: 'اطلاعات',
  'Command Dashboard': 'کمانڈ ڈیش بورڈ',
  'Operations Map': 'آپریشنز نقشہ',
  Incidents: 'واقعات',
  'Smart Dispatch': 'اسمارٹ ڈسپیچ',
  Dispatch: 'ڈسپیچ',
  'Emergency Alerts': 'ہنگامی الرٹس',
  Resolutions: 'حل شدہ',
  Staff: 'عملہ',
  Departments: 'محکمے',
  Resources: 'وسائل',
  Shelters: 'پناہ گاہیں',
  Analytics: 'تجزیات',
  'Audit Logs': 'آڈٹ لاگز',
  Settings: 'ترتیبات',
  'Sign out': 'سائن آؤٹ',
  Back: 'واپس',

  // ── Report page ─────────────────────────────────────────
  'Report an Emergency': 'ایمرجنسی کی رپورٹ کریں',
  'What happened?': 'کیا ہوا؟',
  'Emergency details': 'ایمرجنسی کی تفصیلات',
  Location: 'مقام',
  'Photo evidence (optional)': 'تصویری ثبوت (اختیاری)',
  'Submit Emergency Report': 'ایمرجنسی رپورٹ جمع کریں',
  'Submitting report…': 'رپورٹ جمع ہو رہی ہے…',
  'Use my GPS location': 'میرا GPS مقام استعمال کریں',
  'Locating…': 'مقام تلاش ہو رہا ہے…',
  'Short title': 'مختصر عنوان',
  'What is happening?': 'کیا ہو رہا ہے؟',
  'Contact number': 'رابطہ نمبر',
  'People affected (estimate)': 'متاثرہ افراد (تخمینہ)',
  Latitude: 'عرض بلد',
  Longitude: 'طول بلد',
  'Landmark / area name (optional)': 'نشان / علاقے کا نام (اختیاری)',
  'Tap to attach a photo of the emergency': 'ایمرجنسی کی تصویر منسلک کرنے کے لیے ٹیپ کریں',
  'Open live camera': 'لائیو کیمرا کھولیں',
  'Upload photo': 'تصویر اپ لوڈ کریں',
  Remove: 'ہٹائیں',

  // ── Common ──────────────────────────────────────────────
  Search: 'تلاش کریں',
  Loading: 'لوڈ ہو رہا ہے…',
  Refresh: 'ریفریش',
  Cancel: 'منسوخ',
  Save: 'محفوظ کریں',
  Submit: 'جمع کریں',
  Go: 'جائیں',
  'Weather Intelligence': 'موسمی معلومات',
  'Current Conditions': 'موجودہ حالات',
  '5-Day Forecast': '5 دن کی پیش گوئی',
  Temperature: 'درجہ حرارت',
  Humidity: 'نمی',
  'Wind Speed': 'ہوا کی رفتار',
  'UV Index': 'یو وی انڈیکس',
  Light: 'لائٹ',
  Dark: 'ڈارک',
  Language: 'زبان'
};

const DICTS = { en: null, ur: UR };

/** Translate a string for the active language (falls back to input). */
export function translate(text, lang) {
  if (!text) return text;
  const dict = DICTS[lang];
  if (!dict) return text;
  return dict[text] ?? text;
}

/** Hook — returns t(), active lang and setLang. */
export function useTranslation() {
  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);
  return {
    lang,
    setLang,
    t: (text) => translate(text, lang)
  };
}

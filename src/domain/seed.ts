/**
 * داده‌ی اولیه، برگرفته از لوح خدمتی «کشیک ششم انتظامات حرم مطهر رضوی»
 * دوشنبه ۱۴۰۵/۰۷/۰۶ — مناطق «یک و دو»، «پنج» و «هفت».
 */
import type { Khadem, Post, Shift, TimeSlot, Zone } from './types';

export const seedShiftMeta = {
  title: 'کشیک ششم انتظامات حرم مطهر رضوی',
  subtitle: 'لوح خدمتی کشیک ششم روز',
  dateJalali: '۱۴۰۵/۰۷/۰۶',
  weekday: 'دوشنبه',
  dedication: 'به یادبود شهیدان جنگ تحمیلی سوم',
} as const;

export const seedZones: Zone[] = [
  { id: 'z1', name: 'منطقه یک و دو', order: 1, color: '#2f7a4d' },
  { id: 'z5', name: 'منطقه پنج', order: 2, color: '#1d6fa5' },
  { id: 'z7', name: 'منطقه هفت', order: 3, color: '#c2622b' },
];

export const seedTimeSlots: TimeSlot[] = [
  { id: 's1', label: '۶ - ۸', startHour: 6, endHour: 8, order: 1 },
  { id: 's2', label: '۸ - ۱۰', startHour: 8, endHour: 10, order: 2 },
  { id: 's3', label: '۱۰ - ۱۲', startHour: 10, endHour: 12, order: 3 },
  { id: 's4', label: '۱۲ - ۱۴', startHour: 12, endHour: 14, order: 4, isPrayerWindow: true },
];

type PostSeed = Omit<Post, 'id' | 'zoneId' | 'order'> & { id: string };

const buildPosts = (zoneId: string, seeds: PostSeed[]): Post[] =>
  seeds.map((p, i) => ({ ...p, zoneId, order: i + 1 }));

export const seedPosts: Post[] = [
  ...buildPosts('z1', [
    { id: 'z1-rowzeh', name: 'روضه منوره', capacity: 3, hardship: 2, isCritical: true, kind: 'active', requiresExperienceMix: true },
    { id: 'z1-dar-hoffaz', name: 'دارالحفاظ', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z1-hedayah', name: 'رواق دارالهدایه', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z1-velayah', name: 'رواق دارالولایه', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z1-quran', name: 'دارالقرآن', capacity: 1, hardship: 2, isCritical: false, kind: 'active' },
    { id: 'z1-siadah', name: 'رواق دارالسیاده', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z1-masoumeh', name: 'رواق حضرت معصومه(س)', capacity: 1, hardship: 5, isCritical: false, kind: 'active' },
    { id: 'z1-rest', name: 'استراحت و نماز (آسایشگاه منطقه ۱)', capacity: 99, hardship: 0, isCritical: false, kind: 'rest' },
  ]),
  ...buildPosts('z5', [
    { id: 'z5-emam-n', name: 'گشت رواق امام(ره)/شمال', capacity: 1, hardship: 3, isCritical: true, kind: 'active' },
    { id: 'z5-emam-s', name: 'گشت رواق امام(ره)/جنوب', capacity: 1, hardship: 3, isCritical: true, kind: 'active' },
    { id: 'z5-emam-c', name: 'گشت رواق امام(ره)/مرکز', capacity: 1, hardship: 3, isCritical: true, kind: 'active' },
    { id: 'z5-rahbagh', name: 'ره باغ رواق امام(ره)', capacity: 1, hardship: 5, isCritical: false, kind: 'active' },
    { id: 'z5-zohd', name: 'دارالزهد شیخ بهایی', capacity: 1, hardship: 2, isCritical: false, kind: 'active' },
    { id: 'z5-rahro', name: 'راهرو ولایت', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z5-ebad', name: 'رواق دارالعباد', capacity: 1, hardship: 2, isCritical: false, kind: 'active' },
    { id: 'z5-esc-19', name: 'پله برقی غربی رواق دارالمرحمه ۱۹', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z5-esc-20', name: 'پله برقی شرقی رواق دارالمرحمه ۲۰', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z5-asayesh', name: 'پست آسایشگاه', capacity: 1, hardship: 0, isCritical: false, kind: 'active' },
    { id: 'z5-rest', name: 'استراحت و نماز (آسایشگاه منطقه ۵)', capacity: 99, hardship: 0, isCritical: false, kind: 'rest' },
  ]),
  ...buildPosts('z7', [
    { id: 'z7-hojjah-e', name: 'گشت رواق دارالحجه شرق', capacity: 1, hardship: 3, isCritical: true, kind: 'active' },
    { id: 'z7-hojjah-w', name: 'گشت رواق دارالحجه غرب', capacity: 1, hardship: 3, isCritical: true, kind: 'active' },
    { id: 'z7-hojjah-c', name: 'گشت رواق دارالحجه مرکز', capacity: 2, hardship: 3, isCritical: true, kind: 'active', requiresExperienceMix: true },
    { id: 'z7-panjereh', name: 'پنجره نقره دارالحجه', capacity: 1, hardship: 5, isCritical: true, kind: 'active' },
    { id: 'z7-esc-tusi', name: 'پله برقی هشتی شیخ طوسی', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z7-esc-horameli', name: 'پله برقی هشتی شیخ حرعاملی', capacity: 1, hardship: 2, isCritical: true, kind: 'active' },
    { id: 'z7-esc-velayah', name: 'پله برقی دارالولایه', capacity: 1, hardship: 2, isCritical: false, kind: 'active' },
    { id: 'z7-aramestan', name: 'آرامستان حضرت زهرا(س)', capacity: 1, hardship: 5, isCritical: false, kind: 'active' },
    { id: 'z7-ravaghha', name: 'رواق های حرعاملی و شیخ طوسی', capacity: 1, hardship: 2, isCritical: false, kind: 'active' },
    { id: 'z7-rest', name: 'استراحت و نماز (آسایشگاه منطقه ۷)', capacity: 99, hardship: 0, isCritical: false, kind: 'rest' },
  ]),
];

const namesByZone: Record<string, string[]> = {
  z1: [
    'غلامی', 'واحدی نسب', 'مقدم', 'دائمی', 'تارین', 'مکیان', 'مرادی', 'خسروی', 'برادران',
    'هاجری', 'کاظمی', 'نیکو', 'قلی زاده', 'تقی زادگان', 'قاجاری', 'فاضل', 'نوین', 'مطلبی',
  ],
  z5: [
    'ناصری', 'علی نسب', 'نوکار', 'شاپوری', 'مروی مقدم', 'مظاهری', 'مؤذن', 'فخری', 'شریعت', 'کبیری',
    'اکبر السادات', 'سرگلزهی', 'حبیبی', 'غریب', 'حسن پور', 'کیخانی', 'خانی', 'عربی', 'اصغریان', 'معتمدی',
  ],
  z7: [
    'رضازاده', 'نوتاش', 'احمدی', 'خوراکیان', 'فخیمی', 'نحوی', 'ابوترابی', 'جانفزا', 'ملاجلال', 'کریمیان',
    'کوهستانی', 'صادقی', 'شاه آبادی', 'منفرد', 'غفاریان', 'ناظمی', 'سعیدی', 'پیوندیان', 'قلی زاده (۷)', 'موسوی مهر',
  ],
};

export const seedKhadems: Khadem[] = Object.entries(namesByZone).flatMap(([zoneId, names]) =>
  names.map((fullName, i) => ({
    id: `${zoneId}-k${i + 1}`,
    fullName,
    // توزیع یک‌درمیان تا هر منطقه ترکیب متعادلی از پیشکسوت و تازه‌کار داشته باشد
    seniority: (i % 2 === 0 ? 'veteran' : 'novice') as Khadem['seniority'],
    preferredZoneId: zoneId,
    historyHardship: 0,
  })),
);

export const seedSignatures: NonNullable<Shift['signatures']> = {
  shiftChief: 'آقای حمید کبیری',
  deputy: 'آقای بهرام عرفانیان',
  shiftManager: 'آقای نوتاش',
  host: 'آقای بهروز',
  reciter: 'آقای حسن غلامی',
};

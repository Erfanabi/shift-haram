const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** تبدیل ارقام لاتین به فارسی برای نمایش */
export const fa = (value: number | string): string =>
  String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);

/** تاریخ امروز به شمسی، مثلاً «۱۴۰۵/۰۷/۰۶» */
export function todayJalali(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return fa(`${get('year')}/${get('month')}/${get('day')}`);
}

/** نام روز هفته به فارسی */
export function weekdayFa(date = new Date()): string {
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(date);
}

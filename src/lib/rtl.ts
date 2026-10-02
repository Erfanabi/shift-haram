import { I18nManager, Platform } from 'react-native';

/**
 * رابط کاربری کاملاً راست‌به‌چپ است.
 *
 * روی بیلد native، RTL از طریق پلاگین `expo-localization` با گزینه‌ی
 * `forcesRTL` در app.json اعمال می‌شود (پیش از اجرای جاوااسکریپت).
 * فراخوانی زیر فقط حالت پشتیبان برای Expo Go است و اثرش پس از بارگذاری
 * مجدد دیده می‌شود. روی وب، جهت سند تنظیم می‌گردد.
 */
export function enableRtl(): void {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'fa');
    }
    return;
  }
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
}

/** رنگ‌های مشترک بین UI و خروجی چاپی لوح */
export const COLORS = {
  ink: '#1f2430',
  muted: '#6b7280',
  line: '#d8dde5',
  paper: '#f7f7f9',
  rest: '#e8eef5',
  late: '#f59e0b',
  danger: '#dc2626',
  ok: '#16a34a',
  highlight: '#fde68a',
} as const;

/** رنگ متن مناسب روی پس‌زمینه‌ی رنگی منطقه */
export const withAlpha = (hex: string, alpha: number): string => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

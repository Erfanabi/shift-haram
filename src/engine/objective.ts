/**
 * قوانین نرم (اهداف بهینه‌سازی). خروجی «جریمه» است؛ هرچه کمتر، چیدمان بهتر.
 * وزن‌ها در WEIGHTS متمرکز شده‌اند تا تنظیم‌شان یک‌جا باشد.
 */
import type { KhademId } from '../domain/types';
import type { ZoneBoard } from './board';
import type { EngineContext } from './context';

export const WEIGHTS = {
  /** ۱. عدالت در سختی پست */
  hardshipEquity: 10,
  /** ۲. چرخش مکانی درون منطقه */
  spatialRotation: 3,
  /** ۳. هماهنگی نماز و پذیرایی (توزیع چرخشی استراحت) */
  restBalance: 4,
  /** ترجیح پست تکراری در بازه‌ی متوالی */
  repeatPost: 2,
} as const;

export interface ZoneScore {
  penalty: number;
  hardshipEquity: number; // ۰ تا ۱، بزرگ‌تر بهتر
  rotationQuality: number; // ۰ تا ۱
  restBalance: number; // ۰ تا ۱
}

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

const stdDev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

export function scoreZone(ctx: EngineContext, board: ZoneBoard): ZoneScore {
  const members = board.members;
  if (members.length === 0) {
    return { penalty: 0, hardshipEquity: 1, rotationQuality: 1, restBalance: 1 };
  }

  // ۱ — عدالت سختی: سختی این کشیک + سابقه‌ی کشیک‌های گذشته
  const hardships = members.map(
    (id) => board.hardshipOf(id) + (ctx.khademById.get(id)?.historyHardship ?? 0),
  );
  const hardshipMean = mean(hardships);
  const hardshipSd = stdDev(hardships);
  const hardshipEquity = hardshipMean === 0 ? 1 : Math.max(0, 1 - hardshipSd / hardshipMean);

  // ۲ — چرخش مکانی: نسبت پست‌های متمایز به تعداد بازه‌های فعال
  let rotationSum = 0;
  let repeats = 0;
  for (const id of members) {
    const active = board.activeCount(id);
    const distinct = board.distinctPosts(id);
    rotationSum += active <= 1 ? 1 : distinct / active;
    repeats += countRepeats(board, id);
  }
  const rotationQuality = rotationSum / members.length;

  // ۳ — توازن استراحت: پراکندگی تعداد بازه‌های فعال بین اعضای منطقه
  const actives = members.map((id) => board.activeCount(id));
  const activeMean = mean(actives);
  const activeSd = stdDev(actives);
  const restBalance = activeMean === 0 ? 1 : Math.max(0, 1 - activeSd / activeMean);

  const penalty =
    WEIGHTS.hardshipEquity * (1 - hardshipEquity) +
    WEIGHTS.spatialRotation * (1 - rotationQuality) +
    WEIGHTS.restBalance * (1 - restBalance) +
    (WEIGHTS.repeatPost * repeats) / Math.max(1, members.length);

  return { penalty, hardshipEquity, rotationQuality, restBalance };
}

/** تعداد دفعاتی که خادم دو بازه‌ی پشت‌سرهم در یک پست مانده */
function countRepeats(board: ZoneBoard, khademId: KhademId): number {
  let repeats = 0;
  for (let i = 1; i < board.slots.length; i++) {
    const prev = board.postOf(khademId, board.slots[i - 1]!.id);
    const curr = board.postOf(khademId, board.slots[i]!.id);
    if (prev && curr && prev === curr) repeats += 1;
  }
  return repeats;
}

/**
 * شاخص عدالت کل لوح (۰ تا ۱۰۰) — همان عددی که در توست «تولید شد با ٪…» نشان داده می‌شود.
 */
export function fairnessScore(scores: ZoneScore[]): number {
  if (scores.length === 0) return 100;
  const avg = (pick: (s: ZoneScore) => number) => mean(scores.map(pick));
  const value =
    0.6 * avg((s) => s.hardshipEquity) +
    0.2 * avg((s) => s.rotationQuality) +
    0.2 * avg((s) => s.restBalance);
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

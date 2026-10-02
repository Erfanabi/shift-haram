/**
 * فاز ۱ — تخصیص خادم به منطقه (تثبیت جغرافیایی).
 *
 * خروجی این فاز `zoneOf` است: هر خادم حاضر دقیقاً به یک منطقه می‌چسبد و تا
 * پایان شیفت قفل می‌ماند. ملاک‌ها:
 *   - ظرفیت/تقاضای هر منطقه (جمع ظرفیت پست‌های فعال)
 *   - احترام به منطقه‌ی ترجیحی (سابقه‌ی کشیک‌های قبلی)
 *   - توازن پیشکسوت/تازه‌کار بین مناطق (قانون نرم ۴)
 *   - پخش متوازن خادمان تأخیری تا هیچ منطقه‌ای در بازه‌های اول خالی نماند
 */
import type { Khadem, KhademId, ZoneId } from '../domain/types';
import { isAvailableAt, zoneDemand, type EngineContext } from './context';
import type { Rng } from './rng';

export interface ZoneAssignmentResult {
  zoneOf: Record<KhademId, ZoneId>;
  /** تعداد نفرات تخصیص‌یافته به هر منطقه */
  headcount: Record<ZoneId, number>;
  /** تقاضای هر منطقه در هر بازه */
  demand: Record<ZoneId, number>;
}

/** توزیع نسبتی با روش «بزرگ‌ترین باقی‌مانده» تا مجموع سهم‌ها دقیقاً برابر کل شود. */
function largestRemainder(weights: number[], total: number): number[] {
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW === 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sumW) * total);
  const base = exact.map(Math.floor);
  let left = total - base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    base[i]! += 1;
    left -= 1;
  }
  return base;
}

export function assignZones(ctx: EngineContext, rng: Rng): ZoneAssignmentResult {
  const zones = ctx.zones;
  const demand: Record<ZoneId, number> = {};
  for (const z of zones) demand[z.id] = zoneDemand(ctx, z.id);

  const pool = [...ctx.availableKhadems];
  const targets: Record<ZoneId, number> = {};
  const shares = largestRemainder(
    zones.map((z) => demand[z.id] ?? 0),
    pool.length,
  );
  zones.forEach((z, i) => {
    targets[z.id] = shares[i] ?? 0;
  });

  const firstSlot = ctx.slotsOrdered[0];
  const isLate = (k: Khadem) => (firstSlot ? !isAvailableAt(ctx, k.id, firstSlot) : false);

  const globalVeteranRatio =
    pool.length === 0 ? 0 : pool.filter((k) => k.seniority === 'veteran').length / pool.length;
  const globalLateRatio = pool.length === 0 ? 0 : pool.filter(isLate).length / pool.length;

  const zoneOf: Record<KhademId, ZoneId> = {};
  const assigned: Record<ZoneId, Khadem[]> = Object.fromEntries(zones.map((z) => [z.id, []]));

  /** چقدر این نفر به تعادل منطقه کمک می‌کند؟ عدد بزرگ‌تر = مطلوب‌تر */
  const score = (zoneId: ZoneId, k: Khadem): number => {
    const current = assigned[zoneId]!;
    const target = targets[zoneId] ?? 0;
    const n = current.length;
    let s = 0;

    if (k.preferredZoneId === zoneId) s += 3;

    const veteransNow = current.filter((x) => x.seniority === 'veteran').length;
    const wantVeterans = globalVeteranRatio * target;
    const veteranDeficit = wantVeterans - veteransNow;
    s += k.seniority === 'veteran' ? veteranDeficit : -veteranDeficit;

    const latesNow = current.filter(isLate).length;
    const wantLates = globalLateRatio * target;
    const lateDeficit = wantLates - latesNow;
    s += (isLate(k) ? lateDeficit : -lateDeficit) * 1.5;

    // فضای خالی بیشتر منطقه ⇒ اولویت بالاتر، تا مناطق هم‌زمان پر شوند
    s += (target - n) * 0.25;

    return s + rng() * 0.01; // شکستن تساوی به‌صورت قطعی اما بدون سوگیری ترتیب ورودی
  };

  while (pool.length > 0) {
    const openZones = zones.filter((z) => assigned[z.id]!.length < (targets[z.id] ?? 0));
    const candidates = openZones.length > 0 ? openZones : zones;

    let best: { zoneId: ZoneId; index: number; value: number } | undefined;
    for (const zone of candidates) {
      for (let i = 0; i < pool.length; i++) {
        const value = score(zone.id, pool[i]!);
        if (!best || value > best.value) best = { zoneId: zone.id, index: i, value };
      }
    }
    if (!best) break;

    const [khadem] = pool.splice(best.index, 1);
    assigned[best.zoneId]!.push(khadem!);
    zoneOf[khadem!.id] = best.zoneId;
  }

  const headcount: Record<ZoneId, number> = {};
  for (const z of zones) headcount[z.id] = assigned[z.id]!.length;

  return { zoneOf, headcount, demand };
}

/** اعمال قفل‌های دستی سرگروه روی خروجی فاز ۱ */
export function applyPins(
  result: ZoneAssignmentResult,
  pins: Record<KhademId, ZoneId> | undefined,
): ZoneAssignmentResult {
  if (!pins) return result;
  const zoneOf = { ...result.zoneOf };
  const headcount = { ...result.headcount };
  for (const [khademId, zoneId] of Object.entries(pins)) {
    const previous = zoneOf[khademId];
    if (previous === zoneId) continue;
    if (previous && headcount[previous] !== undefined) headcount[previous] -= 1;
    zoneOf[khademId] = zoneId;
    headcount[zoneId] = (headcount[zoneId] ?? 0) + 1;
  }
  return { ...result, zoneOf, headcount };
}

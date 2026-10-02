/**
 * موتور چیدمان — نقطه‌ی ورود واحد.
 *
 *   generateSchedule(input) →  { shift, violations, shortages, fairnessScore }
 *
 * اگر جواب ممکنی وجود نداشته باشد، به‌جای خروجی ناقصِ بی‌توضیح، دقیقاً گزارش
 * می‌شود کدام پست در کدام بازه و با کمبود چند نفر پر نشده است.
 */
import type { KhademId, Shift, ZoneId } from '../domain/types';
import { buildContext, type EngineContext, type EngineInput } from './context';
import { applyPins, assignZones } from './phase1ZoneAssignment';
import { fairnessScore, type ZoneScore } from './objective';
import { rotateZone, type Shortage } from './phase2Rotation';
import { createRng } from './rng';
import { validateSchedule, type Violation } from './validate';

export interface EngineResult {
  shift: Shift;
  violations: Violation[];
  shortages: Shortage[];
  fairnessScore: number;
  headcount: Record<ZoneId, number>;
  demand: Record<ZoneId, number>;
  zoneScores: Record<ZoneId, ZoneScore>;
  /** زمان اجرای موتور به میلی‌ثانیه */
  elapsedMs: number;
}

export const DEFAULT_SEED = 1405;

export function generateSchedule(
  input: EngineInput,
  meta: { id: string; dateJalali: string; title: string; signatures?: Shift['signatures'] },
): EngineResult {
  const startedAt = Date.now();
  const ctx = buildContext(input);
  const rng = createRng(input.seed ?? DEFAULT_SEED);

  // فاز ۱ — تخصیص خادم به منطقه و قفل جغرافیایی
  const phase1 = applyPins(assignZones(ctx, rng), input.pinnedZones);

  // فاز ۲ — چرخش درون هر منطقه، مستقل از بقیه
  const membersByZone = new Map<ZoneId, KhademId[]>();
  for (const zone of ctx.zones) membersByZone.set(zone.id, []);
  for (const [khademId, zoneId] of Object.entries(phase1.zoneOf)) {
    membersByZone.get(zoneId)?.push(khademId);
  }

  const shortages: Shortage[] = [];
  const zoneScores: Record<ZoneId, ZoneScore> = {};
  const assignments = [];
  for (const zone of ctx.zones) {
    const result = rotateZone(ctx, zone.id, membersByZone.get(zone.id) ?? [], rng);
    shortages.push(...result.shortages);
    zoneScores[zone.id] = result.score;
    assignments.push(...result.board.toAssignments());
  }

  const shift: Shift = {
    id: meta.id,
    dateJalali: meta.dateJalali,
    title: meta.title,
    status: 'draft',
    zoneOf: phase1.zoneOf,
    assignments,
    signatures: meta.signatures,
  };

  return {
    shift,
    violations: validateSchedule(ctx, shift),
    shortages,
    fairnessScore: fairnessScore(Object.values(zoneScores)),
    headcount: phase1.headcount,
    demand: phase1.demand,
    zoneScores,
    elapsedMs: Date.now() - startedAt,
  };
}

export { buildContext };
export type { EngineContext, EngineInput, Shortage, ZoneScore };
export * from './validate';

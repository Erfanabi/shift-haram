/**
 * اعتبارسنج قوانین سخت — تنها مرجع حقیقت، هم برای موتور و هم برای ویرایش دستی UI.
 * سرگروه تصمیم می‌گیرد؛ این ماژول نگهبان قوانین است.
 */
import type {
  Assignment,
  CellKey,
  KhademId,
  Post,
  Shift,
  SlotId,
  TimeSlot,
} from '../domain/types';
import { cellKey } from '../domain/types';
import { isAvailableAt, type EngineContext } from './context';

export type ViolationCode =
  | 'ZONE_PINNING' // قید تثبیت جغرافیایی
  | 'DOUBLE_BOOKED' // عدم تداخل زمانی
  | 'CRITICAL_UNDERSTAFFED' // پوشش کامل پست‌های حیاتی
  | 'OVER_CAPACITY' // بیش از ظرفیت پست
  | 'CONSECUTIVE_LIMIT' // سقف استمرار سرپایی
  | 'ABSENT_ASSIGNED' // خادم مرخصی/غایب
  | 'NOT_YET_ARRIVED' // خادم تأخیری، پیش از ساعت ورود
  | 'EXPERIENCE_MIX'; // ترکیب تجربه در پست حساس

export interface Violation {
  code: ViolationCode;
  message: string;
  khademId?: KhademId;
  postId?: string;
  slotId?: SlotId;
}

export const MAX_CONSECUTIVE_ACTIVE = 2;

const VIOLATION_TEXT: Record<ViolationCode, string> = {
  ZONE_PINNING: 'خروج از منطقه‌ی تخصیص‌یافته',
  DOUBLE_BOOKED: 'تداخل زمانی: دو پست هم‌زمان',
  CRITICAL_UNDERSTAFFED: 'پست حیاتی خالی مانده است',
  OVER_CAPACITY: 'بیش از ظرفیت پست',
  CONSECUTIVE_LIMIT: 'بیش از دو بازه پیاپی بدون استراحت',
  ABSENT_ASSIGNED: 'خادم مرخصی در برنامه قرار گرفته است',
  NOT_YET_ARRIVED: 'خادم تأخیری هنوز نرسیده است',
  EXPERIENCE_MIX: 'پست حساس باید یک باتجربه و یک تازه‌کار داشته باشد',
};

export const violationText = (code: ViolationCode): string => VIOLATION_TEXT[code];

interface Index {
  bySlotPost: Map<string, KhademId[]>;
  byKhademSlot: Map<string, string[]>;
}

const sp = (slotId: string, postId: string) => `${slotId}#${postId}`;
const ks = (khademId: string, slotId: string) => `${khademId}#${slotId}`;

function indexAssignments(assignments: Assignment[]): Index {
  const bySlotPost = new Map<string, KhademId[]>();
  const byKhademSlot = new Map<string, string[]>();
  for (const a of assignments) {
    const k1 = sp(a.slotId, a.postId);
    bySlotPost.set(k1, [...(bySlotPost.get(k1) ?? []), a.khademId]);
    const k2 = ks(a.khademId, a.slotId);
    byKhademSlot.set(k2, [...(byKhademSlot.get(k2) ?? []), a.postId]);
  }
  return { bySlotPost, byKhademSlot };
}

/** بررسی کامل لوح در برابر هر شش قانون سخت */
export function validateSchedule(ctx: EngineContext, shift: Shift): Violation[] {
  const violations: Violation[] = [];
  const { bySlotPost, byKhademSlot } = indexAssignments(shift.assignments);
  const name = (id: KhademId) => ctx.khademById.get(id)?.fullName ?? id;

  for (const a of shift.assignments) {
    const post = ctx.postById.get(a.postId);
    const slot = ctx.slotById.get(a.slotId);
    if (!post || !slot) continue;

    // ۱ — تثبیت جغرافیایی
    const zoneOf = shift.zoneOf[a.khademId];
    if (zoneOf && post.zoneId !== zoneOf) {
      violations.push({
        code: 'ZONE_PINNING',
        message: `${name(a.khademId)}: ${VIOLATION_TEXT.ZONE_PINNING}`,
        khademId: a.khademId,
        postId: a.postId,
        slotId: a.slotId,
      });
    }

    // ۵ — حذف غایبان / تأخیری‌ها
    const att = ctx.attendanceOf.get(a.khademId);
    if (att?.status === 'leave') {
      violations.push({
        code: 'ABSENT_ASSIGNED',
        message: `${name(a.khademId)}: ${VIOLATION_TEXT.ABSENT_ASSIGNED}`,
        khademId: a.khademId,
        slotId: a.slotId,
      });
    } else if (!isAvailableAt(ctx, a.khademId, slot)) {
      violations.push({
        code: 'NOT_YET_ARRIVED',
        message: `${name(a.khademId)}: ${VIOLATION_TEXT.NOT_YET_ARRIVED}`,
        khademId: a.khademId,
        slotId: a.slotId,
      });
    }
  }

  // ۲ — عدم تداخل زمانی
  for (const [key, posts] of byKhademSlot) {
    if (posts.length > 1) {
      const [khademId, slotId] = key.split('#');
      violations.push({
        code: 'DOUBLE_BOOKED',
        message: `${name(khademId!)}: ${VIOLATION_TEXT.DOUBLE_BOOKED}`,
        khademId: khademId!,
        slotId: slotId!,
      });
    }
  }

  // ۳ و ظرفیت و ۶ — پوشش، سقف ظرفیت و ترکیب تجربه
  for (const slot of ctx.slotsOrdered) {
    for (const post of ctx.posts) {
      if (post.kind === 'rest') continue;
      const occupants = bySlotPost.get(sp(slot.id, post.id)) ?? [];
      if (post.isCritical && occupants.length < post.capacity) {
        violations.push({
          code: 'CRITICAL_UNDERSTAFFED',
          message: `${post.name} (${slot.label}): ${VIOLATION_TEXT.CRITICAL_UNDERSTAFFED}`,
          postId: post.id,
          slotId: slot.id,
        });
      }
      if (occupants.length > post.capacity) {
        violations.push({
          code: 'OVER_CAPACITY',
          message: `${post.name} (${slot.label}): ${VIOLATION_TEXT.OVER_CAPACITY}`,
          postId: post.id,
          slotId: slot.id,
        });
      }
      if (post.requiresExperienceMix && occupants.length === post.capacity) {
        const seniorities = occupants.map((id) => ctx.khademById.get(id)?.seniority);
        if (!seniorities.includes('veteran') || !seniorities.includes('novice')) {
          violations.push({
            code: 'EXPERIENCE_MIX',
            message: `${post.name} (${slot.label}): ${VIOLATION_TEXT.EXPERIENCE_MIX}`,
            postId: post.id,
            slotId: slot.id,
          });
        }
      }
    }
  }

  // ۴ — سقف استمرار سرپایی
  for (const khadem of ctx.khademById.values()) {
    let run = 0;
    for (const slot of ctx.slotsOrdered) {
      const postId = (byKhademSlot.get(ks(khadem.id, slot.id)) ?? [])[0];
      const active = !!postId && ctx.postById.get(postId)?.kind === 'active';
      run = active ? run + 1 : 0;
      if (run > MAX_CONSECUTIVE_ACTIVE) {
        violations.push({
          code: 'CONSECUTIVE_LIMIT',
          message: `${khadem.fullName}: ${VIOLATION_TEXT.CONSECUTIVE_LIMIT}`,
          khademId: khadem.id,
          slotId: slot.id,
        });
        break;
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// ویرایش دستی: جابه‌جایی درون یک بازه
// ---------------------------------------------------------------------------

export interface MoveRequest {
  khademId: KhademId;
  slotId: SlotId;
  /** پست مقصد در همان بازه */
  toPostId: string;
}

export interface MoveCheck {
  ok: boolean;
  reason?: ViolationCode;
  message?: string;
  /** اگر مقصد پر باشد، با این خادم تعویض می‌شود */
  swapWith?: KhademId;
}

/** شبیه‌سازی یک جابه‌جایی و بازگرداندن فهرست تخصیص‌های حاصل */
export function simulateMove(shift: Shift, move: MoveRequest, swapWith?: KhademId): Assignment[] {
  const fromPostId = shift.assignments.find(
    (a) => a.khademId === move.khademId && a.slotId === move.slotId,
  )?.postId;

  return shift.assignments.map((a) => {
    if (a.slotId !== move.slotId) return a;
    if (a.khademId === move.khademId) return { ...a, postId: move.toPostId };
    if (swapWith && a.khademId === swapWith && fromPostId) return { ...a, postId: fromPostId };
    return a;
  });
}

/**
 * آیا این جابه‌جایی مجاز است؟ اگر مقصد پر باشد، تعویض (swap) در نظر گرفته می‌شود.
 * همان منطقی که درگ‌اندراپ و tap-to-swap هر دو از آن عبور می‌کنند.
 */
export function validateMove(
  ctx: EngineContext,
  shift: Shift,
  move: MoveRequest,
  /** نقض‌های از پیش موجود؛ در فراخوانی‌های پیاپی یک‌بار محاسبه و پاس داده می‌شود */
  baseline?: Violation[],
): MoveCheck {
  const toPost = ctx.postById.get(move.toPostId);
  const slot = ctx.slotById.get(move.slotId);
  if (!toPost || !slot) return { ok: false, reason: 'ZONE_PINNING', message: 'مقصد نامعتبر است' };

  // قانون سخت ۱ — هرگز از منطقه خارج نشو
  const zoneId = shift.zoneOf[move.khademId];
  if (zoneId && toPost.zoneId !== zoneId) {
    return {
      ok: false,
      reason: 'ZONE_PINNING',
      message: `${VIOLATION_TEXT.ZONE_PINNING} — این خادم در «${ctx.zoneById.get(zoneId)?.name}» قفل است`,
    };
  }

  if (!isAvailableAt(ctx, move.khademId, slot)) {
    return { ok: false, reason: 'NOT_YET_ARRIVED', message: VIOLATION_TEXT.NOT_YET_ARRIVED };
  }

  const current = shift.assignments.find(
    (a) => a.khademId === move.khademId && a.slotId === move.slotId,
  );
  if (current?.postId === move.toPostId) {
    return { ok: false, message: 'همین‌جاست' };
  }

  const occupants = shift.assignments
    .filter((a) => a.slotId === move.slotId && a.postId === move.toPostId)
    .map((a) => a.khademId);

  const swapWith =
    toPost.kind !== 'rest' && occupants.length >= toPost.capacity ? occupants[0] : undefined;

  const next: Shift = { ...shift, assignments: simulateMove(shift, move, swapWith) };
  const violations = validateSchedule(ctx, next);
  const before = baseline ?? validateSchedule(ctx, shift);

  // فقط نقض‌هایی که این حرکت ایجاد می‌کند مانع می‌شوند، نه نقض‌های از پیش موجود
  const introduced = violations.filter(
    (v) => !before.some((b) => b.code === v.code && b.khademId === v.khademId && b.slotId === v.slotId && b.postId === v.postId),
  );

  if (introduced.length > 0) {
    const first = introduced[0]!;
    return { ok: false, reason: first.code, message: first.message };
  }

  return { ok: true, swapWith };
}

/** خانه‌های مجاز برای یک خادم در یک بازه — برای سبز کردن drop zoneها در UI */
export function legalTargets(ctx: EngineContext, shift: Shift, khademId: KhademId, slotId: SlotId): Set<CellKey> {
  const zoneId = shift.zoneOf[khademId];
  const result = new Set<CellKey>();
  if (!zoneId) return result;
  const baseline = validateSchedule(ctx, shift);
  for (const post of ctx.postsByZone.get(zoneId) ?? []) {
    if (validateMove(ctx, shift, { khademId, slotId, toPostId: post.id }, baseline).ok) {
      result.add(cellKey(post.id, slotId));
    }
  }
  return result;
}

/** همه‌ی خانه‌های یک خادم در طول روز — برای Smart Highlight */
export function journeyOf(shift: Shift, khademId: KhademId): Set<CellKey> {
  return new Set(
    shift.assignments
      .filter((a) => a.khademId === khademId)
      .map((a) => cellKey(a.postId, a.slotId)),
  );
}

export type { Post, TimeSlot };

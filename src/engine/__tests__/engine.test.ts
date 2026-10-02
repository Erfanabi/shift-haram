import type { Attendance, Shift } from '../../domain/types';
import {
  seedKhadems,
  seedPosts,
  seedShiftMeta,
  seedTimeSlots,
  seedZones,
} from '../../domain/seed';
import { buildContext, generateSchedule, type EngineInput } from '../index';
import { legalTargets, validateMove, validateSchedule } from '../validate';

const baseInput = (overrides: Partial<EngineInput> = {}): EngineInput => ({
  zones: seedZones,
  posts: seedPosts,
  khadems: seedKhadems,
  slots: seedTimeSlots,
  attendance: [],
  ...overrides,
});

const meta = { id: 'test', dateJalali: '۱۴۰۵/۰۷/۰۶', title: 'تست' };

describe('موتور چیدمان — قوانین سخت', () => {
  it('با همه‌ی خادمان حاضر، هیچ قانون سختی نقض نمی‌شود', () => {
    const result = generateSchedule(baseInput(), meta);
    expect(result.violations).toEqual([]);
    expect(result.shortages).toEqual([]);
  });

  it('با seedهای مختلف هم هیچ نقضی رخ نمی‌دهد', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const result = generateSchedule(baseInput({ seed }), meta);
      expect({ seed, violations: result.violations }).toEqual({ seed, violations: [] });
    }
  });

  it('خروجی با seed ثابت قطعی و تکرارپذیر است', () => {
    const a = generateSchedule(baseInput({ seed: 7 }), meta);
    const b = generateSchedule(baseInput({ seed: 7 }), meta);
    expect(b.shift.assignments).toEqual(a.shift.assignments);
    expect(b.fairnessScore).toBe(a.fairnessScore);
  });

  it('قید تثبیت جغرافیایی: هر تخصیص درون منطقه‌ی قفل‌شده‌ی خادم است', () => {
    const { shift } = generateSchedule(baseInput(), meta);
    const postZone = new Map(seedPosts.map((p) => [p.id, p.zoneId]));
    for (const a of shift.assignments) {
      expect(postZone.get(a.postId)).toBe(shift.zoneOf[a.khademId]);
    }
  });

  it('عدم تداخل زمانی: هر خادم در هر بازه حداکثر یک موقعیت دارد', () => {
    const { shift } = generateSchedule(baseInput(), meta);
    const seen = new Set<string>();
    for (const a of shift.assignments) {
      const key = `${a.khademId}#${a.slotId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('سقف استمرار: هیچ‌کس بیش از دو بازه پیاپی سر پست نمی‌ماند', () => {
    const { shift } = generateSchedule(baseInput(), meta);
    const postKind = new Map(seedPosts.map((p) => [p.id, p.kind]));
    const slots = [...seedTimeSlots].sort((a, b) => a.order - b.order);
    for (const khadem of seedKhadems) {
      let run = 0;
      for (const slot of slots) {
        const a = shift.assignments.find((x) => x.khademId === khadem.id && x.slotId === slot.id);
        run = a && postKind.get(a.postId) === 'active' ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(2);
      }
    }
  });

  it('ترکیب تجربه: پست حساسِ پر، هم باتجربه دارد هم تازه‌کار', () => {
    const { shift } = generateSchedule(baseInput(), meta);
    const seniority = new Map(seedKhadems.map((k) => [k.id, k.seniority]));
    for (const post of seedPosts.filter((p) => p.requiresExperienceMix)) {
      for (const slot of seedTimeSlots) {
        const occ = shift.assignments
          .filter((a) => a.postId === post.id && a.slotId === slot.id)
          .map((a) => seniority.get(a.khademId));
        if (occ.length === post.capacity) {
          expect(occ).toContain('veteran');
          expect(occ).toContain('novice');
        }
      }
    }
  });

  it('خادم مرخصی اصلاً وارد فضای حل نمی‌شود', () => {
    const onLeave = seedKhadems.slice(0, 5).map<Attendance>((k) => ({
      khademId: k.id,
      status: 'leave',
    }));
    const { shift, violations } = generateSchedule(baseInput({ attendance: onLeave }), meta);
    expect(violations).toEqual([]);
    for (const a of onLeave) {
      expect(shift.assignments.some((x) => x.khademId === a.khademId)).toBe(false);
      expect(shift.zoneOf[a.khademId]).toBeUndefined();
    }
  });

  it('خادم تأخیری پیش از ساعت ورودش در هیچ پستی قرار نمی‌گیرد', () => {
    const late: Attendance[] = seedKhadems
      .slice(0, 6)
      .map((k) => ({ khademId: k.id, status: 'late', availableFromSlotOrder: 3 }));
    const { shift, violations } = generateSchedule(baseInput({ attendance: late }), meta);
    expect(violations).toEqual([]);
    const earlySlots = seedTimeSlots.filter((s) => s.order < 3).map((s) => s.id);
    for (const a of late) {
      const early = shift.assignments.filter(
        (x) => x.khademId === a.khademId && earlySlots.includes(x.slotId),
      );
      expect(early).toEqual([]);
    }
  });
});

describe('موتور چیدمان — کمبود نیرو', () => {
  it('در کمبود شدید، پست‌های حیاتی حفظ و کسری دقیق گزارش می‌شود', () => {
    // فقط ۱۲ نفر حاضر، بقیه مرخصی
    const attendance = seedKhadems
      .slice(12)
      .map<Attendance>((k) => ({ khademId: k.id, status: 'leave' }));
    const result = generateSchedule(baseInput({ attendance }), meta);

    expect(result.shortages.length).toBeGreaterThan(0);
    // گزارش کسری باید به پست و بازه‌ی مشخص اشاره کند
    for (const s of result.shortages) {
      expect(seedPosts.some((p) => p.id === s.postId)).toBe(true);
      expect(seedTimeSlots.some((t) => t.id === s.slotId)).toBe(true);
      expect(s.missing).toBeGreaterThan(0);
    }
    // تنها نقض مجاز در این حالت، خالی ماندن پست حیاتی است — نه شکستن بقیه‌ی قوانین
    const codes = new Set(result.violations.map((v) => v.code));
    codes.delete('CRITICAL_UNDERSTAFFED');
    expect([...codes]).toEqual([]);
  });

  it('پست‌های شناور زودتر از پست‌های حیاتی خالی می‌مانند', () => {
    const attendance = seedKhadems
      .slice(24)
      .map<Attendance>((k) => ({ khademId: k.id, status: 'leave' }));
    const result = generateSchedule(baseInput({ attendance }), meta);
    const criticalShort = result.shortages.filter((s) => s.isCritical).length;
    const floatingShort = result.shortages.filter((s) => !s.isCritical).length;
    expect(floatingShort).toBeGreaterThanOrEqual(criticalShort);
  });
});

describe('ویرایش دستی', () => {
  const ctx = buildContext(baseInput());
  const { shift } = generateSchedule(baseInput(), meta);

  it('جابه‌جایی به منطقه‌ی دیگر رد می‌شود', () => {
    const a = shift.assignments[0]!;
    const otherZonePost = seedPosts.find((p) => p.zoneId !== shift.zoneOf[a.khademId])!;
    const check = validateMove(ctx, shift, {
      khademId: a.khademId,
      slotId: a.slotId,
      toPostId: otherZonePost.id,
    });
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('ZONE_PINNING');
  });

  it('خانه‌های مجاز فقط درون همان منطقه و همان بازه‌اند', () => {
    const a = shift.assignments.find(
      (x) => ctx.postById.get(x.postId)?.kind === 'rest',
    )!;
    const targets = legalTargets(ctx, shift, a.khademId, a.slotId);
    expect(targets.size).toBeGreaterThan(0);
    for (const key of targets) {
      const [postId, slotId] = key.split('|');
      expect(slotId).toBe(a.slotId);
      expect(ctx.postById.get(postId!)?.zoneId).toBe(shift.zoneOf[a.khademId]);
    }
  });

  it('تعویض مجاز، لوح را همچنان سالم نگه می‌دارد', () => {
    const slotId = seedTimeSlots[0]!.id;
    const a = shift.assignments.find(
      (x) => x.slotId === slotId && ctx.postById.get(x.postId)?.kind === 'rest',
    )!;
    const targets = [...legalTargets(ctx, shift, a.khademId, slotId)];
    expect(targets.length).toBeGreaterThan(0);
    const [postId] = targets[0]!.split('|');
    const move = { khademId: a.khademId, slotId, toPostId: postId! };
    const check = validateMove(ctx, shift, move);
    expect(check.ok).toBe(true);

    const next: Shift = {
      ...shift,
      assignments: shift.assignments.map((x) => {
        if (x.slotId !== slotId) return x;
        if (x.khademId === a.khademId) return { ...x, postId: postId! };
        if (check.swapWith && x.khademId === check.swapWith) return { ...x, postId: a.postId };
        return x;
      }),
    };
    expect(validateSchedule(ctx, next)).toEqual([]);
  });
});

describe('شاخص عدالت', () => {
  it('در حالت کامل، شاخص عدالت بالاست', () => {
    const result = generateSchedule(baseInput(), meta);
    expect(result.fairnessScore).toBeGreaterThanOrEqual(80);
    expect(result.fairnessScore).toBeLessThanOrEqual(100);
  });

  it('موتور در کسری از ثانیه جواب می‌دهد', () => {
    const result = generateSchedule(baseInput(), meta);
    expect(result.elapsedMs).toBeLessThan(3000);
  });
});

describe('متادیتای لوح', () => {
  it('عنوان و تاریخ seed موجود است', () => {
    expect(seedShiftMeta.title).toContain('کشیک');
    expect(seedShiftMeta.dateJalali).toBeTruthy();
  });
});

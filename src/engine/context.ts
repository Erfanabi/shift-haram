import type {
  Attendance,
  Khadem,
  KhademId,
  Post,
  PostId,
  SlotId,
  TimeSlot,
  Zone,
  ZoneId,
} from '../domain/types';

export interface EngineInput {
  zones: Zone[];
  posts: Post[];
  khadems: Khadem[];
  slots: TimeSlot[];
  attendance: Attendance[];
  /** seed ثابت ⇒ خروجی قطعی */
  seed?: number;
  /** قفل دستی منطقه‌ی بعضی خادمان (وقتی سرگروه ناحیه‌ی فرد را صراحتاً تعیین کرده) */
  pinnedZones?: Record<KhademId, ZoneId>;
}

/**
 * نگاشت‌های آماده روی ورودی تا بقیه‌ی موتور و اعتبارسنج بدون جست‌وجوی خطی کار کنند.
 */
export interface EngineContext {
  zones: Zone[];
  posts: Post[];
  khadems: Khadem[];
  slots: TimeSlot[];
  postById: Map<PostId, Post>;
  khademById: Map<KhademId, Khadem>;
  slotById: Map<SlotId, TimeSlot>;
  zoneById: Map<ZoneId, Zone>;
  postsByZone: Map<ZoneId, Post[]>;
  /** پست استراحت هر منطقه */
  restPostOf: Map<ZoneId, Post>;
  attendanceOf: Map<KhademId, Attendance>;
  /** خادمانی که وارد فضای حل می‌شوند (مرخصی‌ها حذف شده‌اند) */
  availableKhadems: Khadem[];
  slotsOrdered: TimeSlot[];
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function buildContext(input: EngineInput): EngineContext {
  const slotsOrdered = [...input.slots].sort(byOrder);
  const postById = new Map(input.posts.map((p) => [p.id, p]));
  const khademById = new Map(input.khadems.map((k) => [k.id, k]));
  const slotById = new Map(input.slots.map((s) => [s.id, s]));
  const zoneById = new Map(input.zones.map((z) => [z.id, z]));

  const postsByZone = new Map<ZoneId, Post[]>();
  const restPostOf = new Map<ZoneId, Post>();
  for (const zone of input.zones) {
    const zonePosts = input.posts.filter((p) => p.zoneId === zone.id).sort(byOrder);
    postsByZone.set(zone.id, zonePosts);
    const rest = zonePosts.find((p) => p.kind === 'rest');
    if (rest) restPostOf.set(zone.id, rest);
  }

  const attendanceOf = new Map(input.attendance.map((a) => [a.khademId, a]));

  // قانون سخت ۵: خادم مرخصی/غایب اصلاً وارد فضای حل نمی‌شود.
  const availableKhadems = input.khadems.filter(
    (k) => (attendanceOf.get(k.id)?.status ?? 'present') !== 'leave',
  );

  return {
    zones: [...input.zones].sort(byOrder),
    posts: input.posts,
    khadems: input.khadems,
    slots: input.slots,
    postById,
    khademById,
    slotById,
    zoneById,
    postsByZone,
    restPostOf,
    attendanceOf,
    availableKhadems,
    slotsOrdered,
  };
}

/** آیا خادم در این بازه در دسترس است؟ (تأخیرها فقط از بازه‌ی اعلامی به بعد) */
export function isAvailableAt(ctx: EngineContext, khademId: KhademId, slot: TimeSlot): boolean {
  const att = ctx.attendanceOf.get(khademId);
  if (!att || att.status === 'present') return true;
  if (att.status === 'leave') return false;
  return slot.order >= (att.availableFromSlotOrder ?? 1);
}

/** ظرفیت فعال یک منطقه در هر بازه (جمع ظرفیت پست‌های غیر استراحت) */
export function zoneDemand(ctx: EngineContext, zoneId: ZoneId): number {
  return (ctx.postsByZone.get(zoneId) ?? [])
    .filter((p) => p.kind === 'active')
    .reduce((sum, p) => sum + p.capacity, 0);
}

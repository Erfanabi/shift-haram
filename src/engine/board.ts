/**
 * ساختار کاری قابل تغییر برای چیدمان یک منطقه.
 * به‌جای جست‌وجوی خطی در آرایه‌ی تخصیص‌ها، نگاشت دوطرفه نگه می‌دارد تا
 * ساخت حریصانه و بهبود تپه‌نوردی ارزان باشد.
 */
import type { Assignment, KhademId, Post, PostId, SlotId, TimeSlot } from '../domain/types';
import type { EngineContext } from './context';

export class ZoneBoard {
  /** slotId → postId → فهرست خادمان مستقر */
  private readonly seats = new Map<SlotId, Map<PostId, KhademId[]>>();
  /** khademId → slotId → postId */
  private readonly placement = new Map<KhademId, Map<SlotId, PostId>>();

  constructor(
    private readonly ctx: EngineContext,
    readonly slots: TimeSlot[],
    readonly members: KhademId[],
  ) {
    for (const slot of slots) this.seats.set(slot.id, new Map());
    for (const id of members) this.placement.set(id, new Map());
  }

  occupants(postId: PostId, slotId: SlotId): KhademId[] {
    return this.seats.get(slotId)?.get(postId) ?? [];
  }

  postOf(khademId: KhademId, slotId: SlotId): PostId | undefined {
    return this.placement.get(khademId)?.get(slotId);
  }

  place(khademId: KhademId, postId: PostId, slotId: SlotId): void {
    const slotMap = this.seats.get(slotId);
    if (!slotMap) return;
    const list = slotMap.get(postId) ?? [];
    list.push(khademId);
    slotMap.set(postId, list);
    this.placement.get(khademId)?.set(slotId, postId);
  }

  remove(khademId: KhademId, slotId: SlotId): PostId | undefined {
    const postId = this.postOf(khademId, slotId);
    if (!postId) return undefined;
    const list = this.seats.get(slotId)?.get(postId);
    if (list) {
      const i = list.indexOf(khademId);
      if (i >= 0) list.splice(i, 1);
    }
    this.placement.get(khademId)?.delete(slotId);
    return postId;
  }

  /** تعداد بازه‌های فعالِ متوالی بلافاصله پیش از این بازه (برای قانون سخت ۴) */
  consecutiveActiveBefore(khademId: KhademId, slotOrder: number): number {
    let count = 0;
    for (let order = slotOrder - 1; order >= 1; order--) {
      const slot = this.slots.find((s) => s.order === order);
      if (!slot) break;
      const postId = this.postOf(khademId, slot.id);
      if (!postId) break;
      const post = this.ctx.postById.get(postId);
      if (!post || post.kind !== 'active') break;
      count += 1;
    }
    return count;
  }

  /** مجموع نمره سختی خادم در این کشیک */
  hardshipOf(khademId: KhademId): number {
    let total = 0;
    for (const slot of this.slots) {
      const postId = this.postOf(khademId, slot.id);
      if (!postId) continue;
      total += this.ctx.postById.get(postId)?.hardship ?? 0;
    }
    return total;
  }

  /** تعداد بازه‌هایی که خادم در آن‌ها پست فعال داشته */
  activeCount(khademId: KhademId): number {
    let total = 0;
    for (const slot of this.slots) {
      const postId = this.postOf(khademId, slot.id);
      if (postId && this.ctx.postById.get(postId)?.kind === 'active') total += 1;
    }
    return total;
  }

  /** تعداد پست‌های متمایزی که خادم تجربه کرده (چرخش مکانی) */
  distinctPosts(khademId: KhademId): number {
    const set = new Set<PostId>();
    for (const slot of this.slots) {
      const postId = this.postOf(khademId, slot.id);
      if (postId && this.ctx.postById.get(postId)?.kind === 'active') set.add(postId);
    }
    return set.size;
  }

  freeSeats(post: Post, slotId: SlotId): number {
    return post.capacity - this.occupants(post.id, slotId).length;
  }

  toAssignments(): Assignment[] {
    const out: Assignment[] = [];
    for (const slot of this.slots) {
      const slotMap = this.seats.get(slot.id);
      if (!slotMap) continue;
      for (const [postId, khadems] of slotMap) {
        for (const khademId of khadems) out.push({ khademId, postId, slotId: slot.id });
      }
    }
    return out;
  }

  snapshot(): Map<KhademId, Map<SlotId, PostId>> {
    const copy = new Map<KhademId, Map<SlotId, PostId>>();
    for (const [khademId, slotMap] of this.placement) copy.set(khademId, new Map(slotMap));
    return copy;
  }

  restore(snapshot: Map<KhademId, Map<SlotId, PostId>>): void {
    for (const slot of this.slots) this.seats.set(slot.id, new Map());
    for (const khademId of this.members) this.placement.set(khademId, new Map());
    for (const [khademId, slotMap] of snapshot) {
      for (const [slotId, postId] of slotMap) this.place(khademId, postId, slotId);
    }
  }
}

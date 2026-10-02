/**
 * فاز ۲ — چرخش درون‌منطقه‌ای.
 *
 * هر منطقه به‌صورت ایزوله حل می‌شود (چون فاز ۱ منطقه را قفل کرده است):
 *   ۱) ساخت حریصانه، بازه‌به‌بازه، با اولویت پست‌های حیاتی و پرسختی
 *   ۲) بهبود با تپه‌نوردی روی حرکت‌های swap / move تا جایی که جریمه‌ی
 *      قوانین نرم کاهش یابد و هیچ قانون سختی نشکند
 */
import type { KhademId, Post, PostId, SlotId, TimeSlot, ZoneId } from '../domain/types';
import { ZoneBoard } from './board';
import { isAvailableAt, type EngineContext } from './context';
import { scoreZone, type ZoneScore } from './objective';
import type { Rng } from './rng';

export interface Shortage {
  zoneId: ZoneId;
  postId: PostId;
  slotId: SlotId;
  missing: number;
  isCritical: boolean;
}

export interface ZoneResult {
  board: ZoneBoard;
  shortages: Shortage[];
  score: ZoneScore;
}

const MAX_CONSECUTIVE_ACTIVE = 2; // قانون سخت ۴: حداکثر دو بازه (چهار ساعت) پیاپی

/** قانون سخت ۴ روی کل تایم‌لاین یک خادم */
function violatesConsecutive(ctx: EngineContext, board: ZoneBoard, khademId: KhademId): boolean {
  let run = 0;
  for (const slot of board.slots) {
    const postId = board.postOf(khademId, slot.id);
    const isActive = !!postId && ctx.postById.get(postId)?.kind === 'active';
    run = isActive ? run + 1 : 0;
    if (run > MAX_CONSECUTIVE_ACTIVE) return true;
  }
  return false;
}

/** قانون سخت ۶: پست حساسِ پرشده باید هم باتجربه داشته باشد هم تازه‌کار */
function experienceMixOk(ctx: EngineContext, board: ZoneBoard, post: Post, slotId: SlotId): boolean {
  if (!post.requiresExperienceMix) return true;
  const occupants = board.occupants(post.id, slotId);
  if (occupants.length < post.capacity) return true; // هنوز در حال پر شدن است
  const seniorities = occupants.map((id) => ctx.khademById.get(id)?.seniority);
  return seniorities.includes('veteran') && seniorities.includes('novice');
}

/** آیا هنوز می‌توان ترکیب تجربه‌ی این پست را با صندلی‌های باقی‌مانده تأمین کرد؟ */
function requiredSeniorityForSeat(
  ctx: EngineContext,
  board: ZoneBoard,
  post: Post,
  slotId: SlotId,
): 'veteran' | 'novice' | undefined {
  if (!post.requiresExperienceMix) return undefined;
  const occupants = board.occupants(post.id, slotId);
  const seatsLeft = post.capacity - occupants.length;
  const seniorities = occupants.map((id) => ctx.khademById.get(id)?.seniority);
  const needVeteran = !seniorities.includes('veteran');
  const needNovice = !seniorities.includes('novice');
  const missing = (needVeteran ? 1 : 0) + (needNovice ? 1 : 0);
  if (missing < seatsLeft) return undefined; // هنوز آزادی عمل هست
  if (needVeteran && !needNovice) return 'veteran';
  if (needNovice && !needVeteran) return 'novice';
  return undefined; // هر دو لازم‌اند و دقیقاً دو صندلی مانده ⇒ هر کدام قابل قبول است
}

/** ترتیب پر کردن پست‌ها: حیاتی‌ها اول، بعد سخت‌ترها */
function orderPosts(posts: Post[]): Post[] {
  return posts
    .filter((p) => p.kind === 'active')
    .sort(
      (a, b) =>
        Number(b.isCritical) - Number(a.isCritical) ||
        b.hardship - a.hardship ||
        b.capacity - a.capacity ||
        a.order - b.order,
    );
}

function buildGreedy(
  ctx: EngineContext,
  zoneId: ZoneId,
  board: ZoneBoard,
  rng: Rng,
): Shortage[] {
  const shortages: Shortage[] = [];
  const posts = ctx.postsByZone.get(zoneId) ?? [];
  const activePosts = orderPosts(posts);
  const restPost = ctx.restPostOf.get(zoneId);

  for (const slot of board.slots) {
    const placedThisSlot = new Set<KhademId>();

    const present = board.members.filter((id) => isAvailableAt(ctx, id, slot));
    const eligible = present.filter(
      (id) => board.consecutiveActiveBefore(id, slot.order) < MAX_CONSECUTIVE_ACTIVE,
    );

    for (const post of activePosts) {
      while (board.freeSeats(post, slot.id) > 0) {
        const required = requiredSeniorityForSeat(ctx, board, post, slot.id);
        const candidates = eligible.filter(
          (id) =>
            !placedThisSlot.has(id) &&
            (!required || ctx.khademById.get(id)?.seniority === required),
        );
        if (candidates.length === 0) break;

        let bestId = candidates[0]!;
        let bestValue = -Infinity;
        for (const id of candidates) {
          const value = seatScore(ctx, board, id, post, slot, rng);
          if (value > bestValue) {
            bestValue = value;
            bestId = id;
          }
        }
        board.place(bestId, post.id, slot.id);
        placedThisSlot.add(bestId);
      }

      const missing = board.freeSeats(post, slot.id);
      if (missing > 0) {
        shortages.push({
          zoneId,
          postId: post.id,
          slotId: slot.id,
          missing,
          isCritical: post.isCritical,
        });
      }
    }

    // بقیه‌ی حاضران (و آن‌ها که سقف استمرار را پر کرده‌اند) به آسایشگاه همان منطقه
    if (restPost) {
      for (const id of present) {
        if (!placedThisSlot.has(id)) board.place(id, restPost.id, slot.id);
      }
    }
  }

  return shortages;
}

/** امتیاز نشاندن یک خادم روی یک صندلی؛ بزرگ‌تر = مناسب‌تر */
function seatScore(
  ctx: EngineContext,
  board: ZoneBoard,
  khademId: KhademId,
  post: Post,
  slot: TimeSlot,
  rng: Rng,
): number {
  const khadem = ctx.khademById.get(khademId);
  const hardshipSoFar = board.hardshipOf(khademId) + (khadem?.historyHardship ?? 0);
  const activeSoFar = board.activeCount(khademId);

  let value = -1.0 * hardshipSoFar - 1.2 * activeSoFar;

  // چرخش مکانی: ماندن در همان پستِ بازه‌ی قبل مطلوب نیست
  const previousSlot = board.slots.find((s) => s.order === slot.order - 1);
  if (previousSlot && board.postOf(khademId, previousSlot.id) === post.id) value -= 2.0;

  // پست حیاتی ترجیحاً به باتجربه
  if (post.isCritical && khadem?.seniority === 'veteran') value += 0.5;

  // اگر بازه‌ی قبل سر پست بوده، نشاندنش یعنی بازه‌ی بعد اجباراً استراحت
  if (board.consecutiveActiveBefore(khademId, slot.order) === 1) value -= 0.3;

  return value + rng() * 0.01;
}

/** آیا وضعیت فعلی تخته از نظر قوانین سخت سالم است؟ */
function boardIsFeasible(ctx: EngineContext, board: ZoneBoard, touched: KhademId[]): boolean {
  for (const id of touched) {
    if (violatesConsecutive(ctx, board, id)) return false;
  }
  for (const slot of board.slots) {
    for (const id of touched) {
      const postId = board.postOf(id, slot.id);
      if (!postId) continue;
      const post = ctx.postById.get(postId);
      if (!post) return false;
      if (!experienceMixOk(ctx, board, post, slot.id)) return false;
    }
  }
  return true;
}

function improve(ctx: EngineContext, board: ZoneBoard, rng: Rng, iterations: number): ZoneScore {
  let best = scoreZone(ctx, board);
  const members = board.members;
  if (members.length < 2) return best;

  for (let i = 0; i < iterations; i++) {
    const slot = board.slots[Math.floor(rng() * board.slots.length)]!;
    const a = members[Math.floor(rng() * members.length)]!;
    const b = members[Math.floor(rng() * members.length)]!;
    if (a === b) continue;

    const postA = board.postOf(a, slot.id);
    const postB = board.postOf(b, slot.id);
    if (!postA || !postB || postA === postB) continue;
    if (!isAvailableAt(ctx, a, slot) || !isAvailableAt(ctx, b, slot)) continue;

    // ترکیب تجربه ممکن است با جابه‌جایی بشکند؛ بعد از اعمال بررسی می‌کنیم
    board.remove(a, slot.id);
    board.remove(b, slot.id);
    board.place(a, postB, slot.id);
    board.place(b, postA, slot.id);

    const feasible = boardIsFeasible(ctx, board, [a, b]);
    const candidate = feasible ? scoreZone(ctx, board) : undefined;

    if (candidate && candidate.penalty < best.penalty - 1e-9) {
      best = candidate;
    } else {
      board.remove(a, slot.id);
      board.remove(b, slot.id);
      board.place(a, postA, slot.id);
      board.place(b, postB, slot.id);
    }
  }

  return best;
}

export function rotateZone(
  ctx: EngineContext,
  zoneId: ZoneId,
  members: KhademId[],
  rng: Rng,
  iterations = 1500,
): ZoneResult {
  const board = new ZoneBoard(ctx, ctx.slotsOrdered, members);
  const shortages = buildGreedy(ctx, zoneId, board, rng);
  const score = improve(ctx, board, rng, iterations);
  return { board, shortages, score };
}

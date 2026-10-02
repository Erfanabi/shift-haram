/**
 * منطق مشترک ویرایش دستی لوح — هم برای tap-to-swap و هم درگ‌اندراپ.
 * هر دو مسیر به `applyMove` در استور می‌رسند و از `validateMove` رد می‌شوند،
 * پس هیچ قانون سختی قابل دور زدن نیست.
 */
import { useCallback, useMemo, useState } from 'react';

import { cellKey, type CellKey, type KhademId, type PostId, type SlotId } from '../domain/types';
import { journeyOf, legalTargets } from '../engine/validate';
import { useShiftStore } from '../store/useShiftStore';
import { useEngineContext } from './useEngineContext';

export interface Selection {
  khademId: KhademId;
  slotId: SlotId;
  postId: PostId;
}

export interface EditorApi {
  selection?: Selection;
  /** خانه‌های مجاز برای انتقال خادمِ انتخاب‌شده (سبز می‌شوند) */
  legal: Set<CellKey>;
  /** همه‌ی خانه‌های خادم انتخاب‌شده در طول روز (Smart Highlight) */
  journey: Set<CellKey>;
  select: (selection: Selection) => void;
  clear: () => void;
  /** تپ روی یک خانه؛ اگر انتخابی فعال باشد تلاش برای جابه‌جایی می‌کند */
  tapCell: (postId: PostId, slotId: SlotId) => { ok: boolean; message?: string } | undefined;
  /** رها کردن کارت روی یک خانه در حالت درگ */
  drop: (postId: PostId, slotId: SlotId) => { ok: boolean; message?: string };
  targetsFor: (khademId: KhademId, slotId: SlotId) => Set<CellKey>;
  isLocked: boolean;
}

export function useScheduleEditor(): EditorApi {
  const shift = useShiftStore((s) => s.shift);
  const applyMove = useShiftStore((s) => s.applyMove);
  const [selection, setSelection] = useState<Selection>();

  const ctx = useEngineContext();
  const isLocked = shift?.status === 'final';

  const targetsFor = useCallback(
    (khademId: KhademId, slotId: SlotId) =>
      shift ? legalTargets(ctx, shift, khademId, slotId) : new Set<CellKey>(),
    [ctx, shift],
  );

  const legal = useMemo(
    () => (selection ? targetsFor(selection.khademId, selection.slotId) : new Set<CellKey>()),
    [selection, targetsFor],
  );

  const journey = useMemo(
    () => (selection && shift ? journeyOf(shift, selection.khademId) : new Set<CellKey>()),
    [selection, shift],
  );

  const select = useCallback((next: Selection) => {
    setSelection((prev) =>
      prev && prev.khademId === next.khademId && prev.slotId === next.slotId ? undefined : next,
    );
  }, []);

  const clear = useCallback(() => setSelection(undefined), []);

  const move = useCallback(
    (khademId: KhademId, slotId: SlotId, toPostId: PostId) => {
      const result = applyMove({ khademId, slotId, toPostId });
      if (result.ok) setSelection(undefined);
      return result;
    },
    [applyMove],
  );

  const tapCell = useCallback(
    (postId: PostId, slotId: SlotId) => {
      if (!selection) return undefined;
      if (selection.slotId !== slotId) {
        return { ok: false, message: 'جابه‌جایی فقط در همان بازه‌ی زمانی ممکن است' };
      }
      if (!legal.has(cellKey(postId, slotId))) {
        // دلیل دقیق را از اعتبارسنج می‌گیریم تا پیام گویا باشد
        return move(selection.khademId, slotId, postId);
      }
      return move(selection.khademId, slotId, postId);
    },
    [legal, move, selection],
  );

  const drop = useCallback(
    (postId: PostId, slotId: SlotId) => {
      if (!selection) return { ok: false, message: 'کارتی انتخاب نشده است' };
      if (selection.slotId !== slotId) {
        setSelection(undefined);
        return { ok: false, message: 'جابه‌جایی فقط در همان بازه‌ی زمانی ممکن است' };
      }
      return move(selection.khademId, slotId, postId);
    },
    [move, selection],
  );

  return { selection, legal, journey, select, clear, tapCell, drop, targetsFor, isLocked };
}

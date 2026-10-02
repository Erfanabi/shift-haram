/**
 * رجیستری هندسه‌ی جدول برای درگ‌اندراپ.
 *
 * به‌جای اندازه‌گیری تک‌تک خانه‌ها، فقط «محدوده‌ی افقی ستون‌ها» و
 * «محدوده‌ی عمودی ردیف‌ها» ثبت می‌شود؛ تقاطع این دو، خانه‌ی زیر انگشت است.
 */
import { useCallback, useRef } from 'react';

import type { PostId, SlotId } from '../domain/types';

interface Span {
  start: number;
  size: number;
}

export interface GridHit {
  postId: PostId;
  slotId: SlotId;
}

export function useCellRegistry() {
  const columns = useRef(new Map<SlotId, Span>());
  const rows = useRef(new Map<PostId, Span>());
  const gridPage = useRef({ x: 0, y: 0 });
  const bodyOffsetY = useRef(0);
  const scroll = useRef({ x: 0, y: 0 });

  const registerColumn = useCallback((slotId: SlotId, start: number, size: number) => {
    columns.current.set(slotId, { start, size });
  }, []);

  const registerRow = useCallback((postId: PostId, start: number, size: number) => {
    rows.current.set(postId, { start, size });
  }, []);

  const setGridPage = useCallback((x: number, y: number) => {
    gridPage.current = { x, y };
  }, []);

  const setBodyOffsetY = useCallback((y: number) => {
    bodyOffsetY.current = y;
  }, []);

  const setScroll = useCallback((x: number, y: number) => {
    scroll.current = { x, y };
  }, []);

  const setScrollX = useCallback((x: number) => {
    scroll.current = { ...scroll.current, x };
  }, []);

  const setScrollY = useCallback((y: number) => {
    scroll.current = { ...scroll.current, y };
  }, []);

  /** کدام خانه زیر این نقطه‌ی صفحه است؟ */
  const hitTest = useCallback((pageX: number, pageY: number): GridHit | undefined => {
    const contentX = pageX - gridPage.current.x + scroll.current.x;
    const contentY = pageY - gridPage.current.y + scroll.current.y - bodyOffsetY.current;

    let slotId: SlotId | undefined;
    for (const [id, span] of columns.current) {
      if (contentX >= span.start && contentX < span.start + span.size) {
        slotId = id;
        break;
      }
    }
    if (!slotId) return undefined;

    let postId: PostId | undefined;
    for (const [id, span] of rows.current) {
      if (contentY >= span.start && contentY < span.start + span.size) {
        postId = id;
        break;
      }
    }
    if (!postId) return undefined;

    return { postId, slotId };
  }, []);

  return {
    registerColumn,
    registerRow,
    setGridPage,
    setBodyOffsetY,
    setScroll,
    setScrollX,
    setScrollY,
    hitTest,
  };
}

export type CellRegistry = ReturnType<typeof useCellRegistry>;

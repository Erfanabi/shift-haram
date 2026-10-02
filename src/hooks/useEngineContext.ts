/**
 * ساخت (و کش کردن) کانتکست موتور از روی داده‌های پایه و حضوروغیاب جاری.
 * همه‌ی صفحه‌هایی که به اعتبارسنج نیاز دارند از همین هوک استفاده می‌کنند.
 */
import { useMemo } from 'react';

import { buildContext, type EngineContext } from '../engine';
import { useDataStore } from '../store/useDataStore';
import { useShiftStore } from '../store/useShiftStore';

export function useEngineContext(): EngineContext {
  const zones = useDataStore((s) => s.zones);
  const posts = useDataStore((s) => s.posts);
  const khadems = useDataStore((s) => s.khadems);
  const slots = useDataStore((s) => s.slots);
  const attendance = useShiftStore((s) => s.attendance);

  return useMemo(
    () =>
      buildContext({ zones, posts, khadems, slots, attendance: Object.values(attendance) }),
    [attendance, khadems, posts, slots, zones],
  );
}

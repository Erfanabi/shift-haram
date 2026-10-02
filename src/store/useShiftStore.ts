/**
 * وضعیت کشیک جاری: حضوروغیاب، لوح تولیدشده، ویرایش‌های دستی و نهایی‌سازی.
 * همه‌ی ویرایش‌ها از یک مسیر واحد (`applyMove`) عبور می‌کنند تا اعتبارسنجی
 * برای tap-to-swap و درگ‌اندراپ یکسان باشد.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { seedShiftMeta, seedSignatures } from '../domain/seed';
import type {
  Attendance,
  AttendanceStatus,
  KhademId,
  Shift,
  ZoneId,
} from '../domain/types';
import {
  buildContext,
  generateSchedule,
  validateMove,
  validateSchedule,
  type EngineContext,
  type MoveRequest,
  type Shortage,
  type Violation,
} from '../engine';
import { simulateMove } from '../engine/validate';
import { useDataStore } from './useDataStore';

interface GenerationMeta {
  fairnessScore: number;
  shortages: Shortage[];
  headcount: Record<ZoneId, number>;
  demand: Record<ZoneId, number>;
  elapsedMs: number;
  generatedAt: number;
}

interface ShiftState {
  attendance: Record<KhademId, Attendance>;
  shift?: Shift;
  meta?: GenerationMeta;
  violations: Violation[];
  history: Shift[];
  future: Shift[];

  setAttendance: (khademId: KhademId, status: AttendanceStatus, fromSlotOrder?: number) => void;
  setAllAttendance: (status: AttendanceStatus) => void;
  attendanceSummary: () => { present: number; leave: number; late: number; total: number };

  generate: (seed?: number) => { ok: boolean; fairnessScore: number; shortages: Shortage[] };
  applyMove: (move: MoveRequest) => { ok: boolean; message?: string };
  undo: () => void;
  redo: () => void;
  finalize: () => void;
  reopen: () => void;
  clear: () => void;
}

const buildCtx = (attendance: Record<KhademId, Attendance>): EngineContext => {
  const { zones, posts, khadems, slots } = useDataStore.getState();
  return buildContext({ zones, posts, khadems, slots, attendance: Object.values(attendance) });
};

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      attendance: {},
      violations: [],
      history: [],
      future: [],

      setAttendance: (khademId, status, fromSlotOrder) =>
        set((s) => ({
          attendance: {
            ...s.attendance,
            [khademId]: {
              khademId,
              status,
              ...(status === 'late' ? { availableFromSlotOrder: fromSlotOrder ?? 2 } : {}),
            },
          },
        })),

      setAllAttendance: (status) =>
        set(() => {
          const { khadems } = useDataStore.getState();
          const next: Record<KhademId, Attendance> = {};
          for (const k of khadems) next[k.id] = { khademId: k.id, status };
          return { attendance: next };
        }),

      attendanceSummary: () => {
        const { khadems } = useDataStore.getState();
        const att = get().attendance;
        let present = 0;
        let leave = 0;
        let late = 0;
        for (const k of khadems) {
          const status = att[k.id]?.status ?? 'present';
          if (status === 'leave') leave += 1;
          else if (status === 'late') late += 1;
          else present += 1;
        }
        return { present, leave, late, total: khadems.length };
      },

      generate: (seed) => {
        const { zones, posts, khadems, slots } = useDataStore.getState();
        const attendance = Object.values(get().attendance);
        const result = generateSchedule(
          { zones, posts, khadems, slots, attendance, seed },
          {
            id: `shift-${Date.now()}`,
            dateJalali: seedShiftMeta.dateJalali,
            title: seedShiftMeta.title,
            signatures: seedSignatures,
          },
        );
        set({
          shift: result.shift,
          violations: result.violations,
          history: [],
          future: [],
          meta: {
            fairnessScore: result.fairnessScore,
            shortages: result.shortages,
            headcount: result.headcount,
            demand: result.demand,
            elapsedMs: result.elapsedMs,
            generatedAt: Date.now(),
          },
        });
        return {
          ok: result.violations.length === 0,
          fairnessScore: result.fairnessScore,
          shortages: result.shortages,
        };
      },

      applyMove: (move) => {
        const state = get();
        const shift = state.shift;
        if (!shift) return { ok: false, message: 'هنوز لوحی تولید نشده است' };
        if (shift.status === 'final') return { ok: false, message: 'لوح قفل شده است' };

        const ctx = buildCtx(state.attendance);
        const check = validateMove(ctx, shift, move);
        if (!check.ok) return { ok: false, message: check.message };

        const next: Shift = { ...shift, assignments: simulateMove(shift, move, check.swapWith) };
        set({
          shift: next,
          history: [...state.history, shift].slice(-30),
          future: [],
          violations: validateSchedule(ctx, next),
        });
        return { ok: true };
      },

      undo: () =>
        set((s) => {
          const previous = s.history[s.history.length - 1];
          if (!previous || !s.shift) return s;
          return {
            shift: previous,
            history: s.history.slice(0, -1),
            future: [s.shift, ...s.future].slice(0, 30),
            violations: validateSchedule(buildCtx(s.attendance), previous),
          };
        }),

      redo: () =>
        set((s) => {
          const next = s.future[0];
          if (!next || !s.shift) return s;
          return {
            shift: next,
            history: [...s.history, s.shift].slice(-30),
            future: s.future.slice(1),
            violations: validateSchedule(buildCtx(s.attendance), next),
          };
        }),

      finalize: () =>
        set((s) => (s.shift ? { shift: { ...s.shift, status: 'final' } } : s)),

      reopen: () => set((s) => (s.shift ? { shift: { ...s.shift, status: 'draft' } } : s)),

      clear: () => set({ shift: undefined, meta: undefined, violations: [], history: [], future: [] }),
    }),
    {
      name: 'khadem-shift-current',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({
        attendance: s.attendance,
        shift: s.shift,
        meta: s.meta,
      }),
    },
  ),
);

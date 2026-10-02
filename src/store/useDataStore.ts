/**
 * داده‌های پایه‌ی سازمانی (مالک: پنل مدیر گروه): مناطق، پست‌ها، خادمان، بازه‌های زمانی.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { seedKhadems, seedPosts, seedTimeSlots, seedZones } from '../domain/seed';
import type { Khadem, Post, TimeSlot, Zone } from '../domain/types';

interface DataState {
  zones: Zone[];
  posts: Post[];
  khadems: Khadem[];
  slots: TimeSlot[];

  upsertZone: (zone: Zone) => void;
  removeZone: (zoneId: string) => void;
  upsertPost: (post: Post) => void;
  removePost: (postId: string) => void;
  upsertKhadem: (khadem: Khadem) => void;
  removeKhadem: (khademId: string) => void;
  resetToSeed: () => void;
}

const upsert = <T extends { id: string }>(list: T[], item: T): T[] => {
  const index = list.findIndex((x) => x.id === item.id);
  if (index < 0) return [...list, item];
  const copy = [...list];
  copy[index] = item;
  return copy;
};

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      zones: seedZones,
      posts: seedPosts,
      khadems: seedKhadems,
      slots: seedTimeSlots,

      upsertZone: (zone) => set((s) => ({ zones: upsert(s.zones, zone) })),
      removeZone: (zoneId) =>
        set((s) => ({
          zones: s.zones.filter((z) => z.id !== zoneId),
          posts: s.posts.filter((p) => p.zoneId !== zoneId),
        })),
      upsertPost: (post) => set((s) => ({ posts: upsert(s.posts, post) })),
      removePost: (postId) => set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) })),
      upsertKhadem: (khadem) => set((s) => ({ khadems: upsert(s.khadems, khadem) })),
      removeKhadem: (khademId) =>
        set((s) => ({ khadems: s.khadems.filter((k) => k.id !== khademId) })),
      resetToSeed: () =>
        set({ zones: seedZones, posts: seedPosts, khadems: seedKhadems, slots: seedTimeSlots }),
    }),
    {
      name: 'khadem-shift-data',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

/**
 * گام ۱ — اعلام حضور. سرگروه وضعیت هر خادم را با یک لمس تغییر می‌دهد.
 * خادمان تأخیری نارنجی مشخص می‌شوند (طبق سند UX).
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Txt } from '../../components/ui';
import type { AttendanceStatus, Khadem } from '../../domain/types';
import { fa } from '../../lib/format';
import { COLORS } from '../../lib/theme';
import { useDataStore } from '../../store/useDataStore';
import { useShiftStore } from '../../store/useShiftStore';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  leave: 'مرخصی',
  late: 'تأخیر',
};

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: COLORS.ok,
  leave: COLORS.danger,
  late: COLORS.late,
};

const NEXT: Record<AttendanceStatus, AttendanceStatus> = {
  present: 'late',
  late: 'leave',
  leave: 'present',
};

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const khadems = useDataStore((s) => s.khadems);
  const zones = useDataStore((s) => s.zones);
  const slots = useDataStore((s) => s.slots);
  const attendance = useShiftStore((s) => s.attendance);
  const setAttendance = useShiftStore((s) => s.setAttendance);
  const setAllAttendance = useShiftStore((s) => s.setAllAttendance);
  const summary = useShiftStore((s) => s.attendanceSummary)();
  const [filter, setFilter] = useState<'all' | AttendanceStatus>('all');

  const grouped = useMemo(() => {
    const map = new Map<string, Khadem[]>();
    for (const zone of zones) map.set(zone.id, []);
    for (const k of khadems) {
      const status = attendance[k.id]?.status ?? 'present';
      if (filter !== 'all' && status !== filter) continue;
      map.get(k.preferredZoneId ?? zones[0]?.id ?? '')?.push(k);
    }
    return map;
  }, [attendance, filter, khadems, zones]);

  return (
    <View className="flex-1">
      <View className="border-b border-[#e6e9ef] bg-white px-4 py-3">
        <View className="flex-row gap-2">
          <SummaryChip
            label="آماده"
            value={summary.present}
            color={COLORS.ok}
            active={filter === 'present'}
            onPress={() => setFilter(filter === 'present' ? 'all' : 'present')}
          />
          <SummaryChip
            label="مرخصی"
            value={summary.leave}
            color={COLORS.danger}
            active={filter === 'leave'}
            onPress={() => setFilter(filter === 'leave' ? 'all' : 'leave')}
          />
          <SummaryChip
            label="تأخیر"
            value={summary.late}
            color={COLORS.late}
            active={filter === 'late'}
            onPress={() => setFilter(filter === 'late' ? 'all' : 'late')}
          />
        </View>
        <View className="mt-3 flex-row gap-2">
          <Button
            title="همه حاضر"
            variant="secondary"
            className="flex-1 py-2"
            onPress={() => setAllAttendance('present')}
          />
          <Button
            title="تولید لوح"
            className="flex-1 py-2"
            onPress={() => router.push('/(leader)/schedule')}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        {zones.map((zone) => {
          const list = grouped.get(zone.id) ?? [];
          if (list.length === 0) return null;
          return (
            <View key={zone.id}>
              <View className="mb-2 flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
                <Txt weight="bold" className="text-[14px] text-ink">
                  {zone.name}
                </Txt>
                <Txt className="text-[12px] text-muted">({fa(list.length)} نفر)</Txt>
              </View>
              <Card className="gap-2 p-2">
                {list.map((khadem) => {
                  const status = attendance[khadem.id]?.status ?? 'present';
                  const fromSlot = attendance[khadem.id]?.availableFromSlotOrder;
                  return (
                    <View key={khadem.id}>
                      <Pressable
                        onPress={() => setAttendance(khadem.id, NEXT[status])}
                        className="flex-row items-center justify-between rounded-xl px-3 py-2.5"
                        style={{ backgroundColor: `${STATUS_COLOR[status]}0f` }}
                      >
                        <View className="flex-row items-center gap-2">
                          {khadem.seniority === 'veteran' ? (
                            <View
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: COLORS.ok }}
                            />
                          ) : null}
                          <Txt weight="medium" className="text-[14px] text-ink">
                            {khadem.fullName}
                          </Txt>
                        </View>
                        <Badge label={STATUS_LABEL[status]} color={STATUS_COLOR[status]} filled />
                      </Pressable>

                      {status === 'late' ? (
                        <View className="mt-1 flex-row items-center gap-2 px-3">
                          <Txt className="text-[11px] text-muted">از بازه:</Txt>
                          {slots.map((slot) => (
                            <Pressable
                              key={slot.id}
                              onPress={() => setAttendance(khadem.id, 'late', slot.order)}
                              className="rounded-md px-2 py-1"
                              style={{
                                backgroundColor:
                                  (fromSlot ?? 2) === slot.order ? COLORS.late : '#00000008',
                              }}
                            >
                              <Txt
                                className="text-[11px]"
                                style={{
                                  color: (fromSlot ?? 2) === slot.order ? '#fff' : COLORS.muted,
                                }}
                              >
                                {slot.label}
                              </Txt>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SummaryChip({
  label,
  value,
  color,
  active,
  onPress,
}: {
  label: string;
  value: number;
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center rounded-xl py-2"
      style={{
        backgroundColor: active ? color : `${color}14`,
        borderWidth: 1,
        borderColor: `${color}44`,
      }}
    >
      <Txt weight="bold" className="text-[18px]" style={{ color: active ? '#fff' : color }}>
        {fa(value)}
      </Txt>
      <Txt className="text-[11px]" style={{ color: active ? '#fff' : color }}>
        {label}
      </Txt>
    </Pressable>
  );
}

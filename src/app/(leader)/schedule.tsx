/**
 * گام ۲ و ۳ — تولید خودکار لوح و ویرایش دستی.
 * تب‌بندی بر اساس منطقه؛ در هر تب فقط پست‌ها و خادمان همان منطقه دیده می‌شوند.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScheduleGrid } from '../../components/ScheduleGrid';
import { useToast } from '../../components/Toast';
import { Button, EmptyState, Txt } from '../../components/ui';
import { useEngineContext } from '../../hooks/useEngineContext';
import { useScheduleEditor } from '../../hooks/useScheduleEditor';
import { fa } from '../../lib/format';
import { COLORS } from '../../lib/theme';
import { useDataStore } from '../../store/useDataStore';
import { useShiftStore } from '../../store/useShiftStore';

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const zones = useDataStore((s) => s.zones);
  const posts = useDataStore((s) => s.posts);
  const slots = useDataStore((s) => s.slots);

  const shift = useShiftStore((s) => s.shift);
  const meta = useShiftStore((s) => s.meta);
  const violations = useShiftStore((s) => s.violations);
  const generate = useShiftStore((s) => s.generate);
  const undo = useShiftStore((s) => s.undo);
  const redo = useShiftStore((s) => s.redo);
  const canUndo = useShiftStore((s) => s.history.length > 0);
  const canRedo = useShiftStore((s) => s.future.length > 0);

  const editor = useScheduleEditor();
  const [activeZoneId, setActiveZoneId] = useState(zones[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  const ctx = useEngineContext();
  const zone = zones.find((z) => z.id === activeZoneId) ?? zones[0];
  const zonePosts = useMemo(
    () => posts.filter((p) => p.zoneId === zone?.id).sort((a, b) => a.order - b.order),
    [posts, zone?.id],
  );
  const orderedSlots = useMemo(() => [...slots].sort((a, b) => a.order - b.order), [slots]);

  const zoneShortages = (meta?.shortages ?? []).filter((s) => s.zoneId === zone?.id);

  const onGenerate = () => {
    setBusy(true);
    // اجرای موتور چند ده میلی‌ثانیه طول می‌کشد؛ یک تیک به UI می‌دهیم تا دکمه واکنش نشان دهد
    setTimeout(() => {
      const result = generate();
      setBusy(false);
      editor.clear();
      if (result.shortages.length > 0) {
        toast('error', `کسری نیرو در ${fa(result.shortages.length)} خانه — پست‌های حیاتی حفظ شد`);
      } else {
        toast('success', `لوح تولید شد — شاخص عدالت ${fa(result.fairnessScore)}٪`);
      }
    }, 30);
  };

  if (!zone) return <EmptyState title="هیچ منطقه‌ای تعریف نشده است" />;

  return (
    <View className="flex-1">
      <View className="border-b border-[#e6e9ef] bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' }}
        >
          {zones.map((z) => {
            const active = z.id === zone.id;
            return (
              <Pressable
                key={z.id}
                onPress={() => {
                  setActiveZoneId(z.id);
                  editor.clear();
                }}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: active ? z.color : `${z.color}14`,
                  borderWidth: 1,
                  borderColor: `${z.color}55`,
                }}
              >
                <Txt
                  weight={active ? 'bold' : 'medium'}
                  className="text-[13px]"
                  style={{ color: active ? '#fff' : z.color }}
                >
                  {z.name}
                  {meta?.headcount?.[z.id] !== undefined
                    ? `  ·  ${fa(meta.headcount[z.id] ?? 0)} نفر`
                    : ''}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {!shift ? (
        <View className="flex-1 justify-center p-6">
          <EmptyState
            title="هنوز لوحی تولید نشده است"
            body="با یک دکمه، موتور خادمان را بین مناطق تخصیص می‌دهد (فاز ۱) و سپس چرخش درون هر منطقه را می‌چیند (فاز ۲)."
          />
          <Button
            title="تولید برنامه شیفت"
            className="mt-4"
            loading={busy}
            onPress={onGenerate}
          />
        </View>
      ) : (
        <>
          {editor.selection ? (
            <View className="flex-row items-center justify-between bg-ink px-4 py-2">
              <Txt className="text-[12px] text-white">
                خانه‌های سبز مقصدِ مجازند — یا کارت را نگه دارید و بکشید
              </Txt>
              <Pressable onPress={editor.clear}>
                <Txt weight="bold" className="text-[12px] text-white">
                  انصراف
                </Txt>
              </Pressable>
            </View>
          ) : null}

          {violations.length > 0 ? (
            <Pressable
              onPress={() => router.push('/(leader)/review')}
              className="flex-row items-center justify-between px-4 py-2"
              style={{ backgroundColor: `${COLORS.danger}14` }}
            >
              <Txt weight="medium" className="text-[12px]" style={{ color: COLORS.danger }}>
                {fa(violations.length)} هشدار قانون سخت
              </Txt>
              <Txt className="text-[12px]" style={{ color: COLORS.danger }}>
                مشاهده ›
              </Txt>
            </Pressable>
          ) : null}

          {zoneShortages.length > 0 ? (
            <View className="px-4 py-2" style={{ backgroundColor: `${COLORS.late}14` }}>
              <Txt className="text-[12px]" style={{ color: '#92400e' }}>
                کسری نیرو در این منطقه: {fa(zoneShortages.length)} خانه
              </Txt>
            </View>
          ) : null}

          <ScheduleGrid
            zone={zone}
            posts={zonePosts}
            slots={orderedSlots}
            shift={shift}
            ctx={ctx}
            editor={editor}
            onForbidden={(message) => toast('error', message)}
            onMoved={() => toast('success', 'جابه‌جایی انجام شد')}
          />

          <View
            className="flex-row gap-2 border-t border-[#e6e9ef] bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <Button
              title="تولید مجدد"
              variant="secondary"
              className="flex-1 py-2.5"
              loading={busy}
              onPress={onGenerate}
            />
            <Button
              title="بازگردانی"
              variant="ghost"
              className="py-2.5 px-3"
              disabled={!canUndo}
              onPress={undo}
            />
            <Button
              title="تکرار"
              variant="ghost"
              className="py-2.5 px-3"
              disabled={!canRedo}
              onPress={redo}
            />
            <Button
              title="بازبینی"
              className="flex-1 py-2.5"
              onPress={() => router.push('/(leader)/review')}
            />
          </View>
        </>
      )}
    </View>
  );
}

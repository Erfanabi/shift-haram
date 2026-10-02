import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Choice, Field } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { Button, Card, SectionTitle, Txt } from '../../components/ui';
import type { Zone } from '../../domain/types';
import { fa } from '../../lib/format';
import { COLORS } from '../../lib/theme';
import { useDataStore } from '../../store/useDataStore';

const PALETTE = ['#2f7a4d', '#1d6fa5', '#c2622b', '#6d28d9', '#b91c1c', '#0f766e'];

export default function ZonesScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const zones = useDataStore((s) => s.zones);
  const posts = useDataStore((s) => s.posts);
  const upsertZone = useDataStore((s) => s.upsertZone);
  const removeZone = useDataStore((s) => s.removeZone);
  const resetToSeed = useDataStore((s) => s.resetToSeed);

  const [draft, setDraft] = useState<Zone>();

  const startNew = () =>
    setDraft({
      id: `z-${Date.now()}`,
      name: '',
      order: zones.length + 1,
      color: PALETTE[zones.length % PALETTE.length]!,
    });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <SectionTitle hint="سلسله‌مراتب: حرم ← منطقه ← پست">مناطق خدمتی</SectionTitle>

      {zones.map((zone) => {
        const count = posts.filter((p) => p.zoneId === zone.id && p.kind === 'active').length;
        return (
          <Card key={zone.id} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 rounded-lg" style={{ backgroundColor: zone.color }} />
              <View>
                <Txt weight="bold" className="text-[14px] text-ink text-right">
                  {zone.name}
                </Txt>
                <Txt className="text-[11px] text-muted text-right">{fa(count)} پست فعال</Txt>
              </View>
            </View>
            <View className="flex-row gap-2">
              <Pressable onPress={() => setDraft(zone)}>
                <Txt className="text-[12px]" style={{ color: COLORS.ink }}>
                  ویرایش
                </Txt>
              </Pressable>
              <Pressable
                onPress={() => {
                  removeZone(zone.id);
                  toast('info', 'منطقه و پست‌هایش حذف شد');
                }}
              >
                <Txt className="text-[12px]" style={{ color: COLORS.danger }}>
                  حذف
                </Txt>
              </Pressable>
            </View>
          </Card>
        );
      })}

      {draft ? (
        <Card className="gap-3">
          <Field label="نام منطقه" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Field
            label="ترتیب نمایش"
            value={String(draft.order)}
            keyboardType="numeric"
            onChangeText={(v) => setDraft({ ...draft, order: Number(v) || 1 })}
          />
          <Choice
            label="رنگ نوار لوح"
            value={draft.color}
            options={PALETTE.map((c) => ({ value: c, label: '●' }))}
            onChange={(color) => setDraft({ ...draft, color })}
          />
          <View className="flex-row gap-2">
            <Button
              title="ذخیره"
              className="flex-1"
              disabled={!draft.name.trim()}
              onPress={() => {
                upsertZone(draft);
                setDraft(undefined);
                toast('success', 'منطقه ذخیره شد');
              }}
            />
            <Button title="انصراف" variant="secondary" className="flex-1" onPress={() => setDraft(undefined)} />
          </View>
        </Card>
      ) : (
        <Button title="افزودن منطقه" variant="secondary" onPress={startNew} />
      )}

      <Button
        title="بازگردانی داده‌ها به لوح نمونه"
        variant="ghost"
        onPress={() => {
          resetToSeed();
          toast('info', 'داده‌ها به لوح نمونه بازگشت');
        }}
      />
    </ScrollView>
  );
}

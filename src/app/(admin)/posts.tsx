import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Choice, Field, Toggle } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, SectionTitle, Txt } from '../../components/ui';
import type { Hardship, Post } from '../../domain/types';
import { fa } from '../../lib/format';
import { COLORS } from '../../lib/theme';
import { useDataStore } from '../../store/useDataStore';

const HARDSHIP_OPTIONS: { value: Hardship; label: string }[] = [
  { value: 0, label: '۰ — آسایشگاه' },
  { value: 2, label: '۲ — رواق مسقف' },
  { value: 3, label: '۳ — گشت' },
  { value: 5, label: '۵ — صحن باز' },
];

export default function PostsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const zones = useDataStore((s) => s.zones);
  const posts = useDataStore((s) => s.posts);
  const upsertPost = useDataStore((s) => s.upsertPost);
  const removePost = useDataStore((s) => s.removePost);

  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [draft, setDraft] = useState<Post>();

  const list = useMemo(
    () => posts.filter((p) => p.zoneId === zoneId).sort((a, b) => a.order - b.order),
    [posts, zoneId],
  );

  const startNew = () =>
    setDraft({
      id: `p-${Date.now()}`,
      zoneId,
      name: '',
      capacity: 1,
      hardship: 2,
      isCritical: false,
      kind: 'active',
      order: list.length + 1,
    });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <View className="flex-row flex-wrap gap-2">
        {zones.map((zone) => {
          const active = zone.id === zoneId;
          return (
            <Pressable
              key={zone.id}
              onPress={() => setZoneId(zone.id)}
              className="rounded-full px-3 py-1.5"
              style={{
                backgroundColor: active ? zone.color : `${zone.color}14`,
                borderWidth: 1,
                borderColor: `${zone.color}55`,
              }}
            >
              <Txt className="text-[12px]" style={{ color: active ? '#fff' : zone.color }}>
                {zone.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle hint={`${fa(list.length)} پست`}>پست‌های منطقه</SectionTitle>

      {list.map((post) => (
        <Card key={post.id} className="gap-2">
          <View className="flex-row items-start justify-between">
            <Txt weight="bold" className="flex-1 text-[14px] text-ink text-right">
              {post.name}
            </Txt>
            <View className="flex-row gap-2">
              <Pressable onPress={() => setDraft(post)}>
                <Txt className="text-[12px] text-ink">ویرایش</Txt>
              </Pressable>
              <Pressable
                onPress={() => {
                  removePost(post.id);
                  toast('info', 'پست حذف شد');
                }}
              >
                <Txt className="text-[12px]" style={{ color: COLORS.danger }}>
                  حذف
                </Txt>
              </Pressable>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Badge label={`ظرفیت ${fa(post.capacity)}`} />
            <Badge label={`سختی ${fa(post.hardship)}`} color="#b45309" />
            {post.isCritical ? <Badge label="حیاتی" color={COLORS.danger} /> : <Badge label="شناور" />}
            {post.kind === 'rest' ? <Badge label="استراحت" color="#1d6fa5" /> : null}
            {post.requiresExperienceMix ? <Badge label="ترکیب تجربه" color="#6d28d9" /> : null}
          </View>
        </Card>
      ))}

      {draft ? (
        <Card className="gap-3">
          <Field label="نام پست" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Field
            label="ظرفیت (نفر در هر بازه)"
            value={String(draft.capacity)}
            keyboardType="numeric"
            onChangeText={(v) => setDraft({ ...draft, capacity: Math.max(1, Number(v) || 1) })}
          />
          <Choice
            label="ضریب سختی"
            value={draft.hardship}
            options={HARDSHIP_OPTIONS}
            onChange={(hardship) => setDraft({ ...draft, hardship })}
          />
          <Choice
            label="نوع پست"
            value={draft.kind}
            options={[
              { value: 'active' as const, label: 'خدمت' },
              { value: 'rest' as const, label: 'استراحت' },
            ]}
            onChange={(kind) => setDraft({ ...draft, kind })}
          />
          <Toggle
            label="پست حیاتی است (هرگز خالی نمی‌ماند)"
            value={draft.isCritical}
            onChange={(isCritical) => setDraft({ ...draft, isCritical })}
          />
          <Toggle
            label="نیازمند ترکیب تجربه (باتجربه + تازه‌کار)"
            value={!!draft.requiresExperienceMix}
            onChange={(requiresExperienceMix) => setDraft({ ...draft, requiresExperienceMix })}
          />
          <View className="flex-row gap-2">
            <Button
              title="ذخیره"
              className="flex-1"
              disabled={!draft.name.trim()}
              onPress={() => {
                upsertPost(draft);
                setDraft(undefined);
                toast('success', 'پست ذخیره شد');
              }}
            />
            <Button title="انصراف" variant="secondary" className="flex-1" onPress={() => setDraft(undefined)} />
          </View>
        </Card>
      ) : (
        <Button title="افزودن پست" variant="secondary" onPress={startNew} />
      )}
    </ScrollView>
  );
}

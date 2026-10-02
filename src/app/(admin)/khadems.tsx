import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Choice, Field } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, SectionTitle, Txt } from '../../components/ui';
import type { Khadem } from '../../domain/types';
import { fa } from '../../lib/format';
import { COLORS } from '../../lib/theme';
import { useDataStore } from '../../store/useDataStore';

export default function KhademsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const zones = useDataStore((s) => s.zones);
  const khadems = useDataStore((s) => s.khadems);
  const upsertKhadem = useDataStore((s) => s.upsertKhadem);
  const removeKhadem = useDataStore((s) => s.removeKhadem);

  const [draft, setDraft] = useState<Khadem>();
  const [query, setQuery] = useState('');

  const list = useMemo(
    () => khadems.filter((k) => k.fullName.includes(query.trim())),
    [khadems, query],
  );

  const veterans = khadems.filter((k) => k.seniority === 'veteran').length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}>
      <SectionTitle hint={`${fa(veterans)} پیشکسوت از ${fa(khadems.length)} نفر`}>خادمان</SectionTitle>

      <Field label="جست‌وجو" value={query} onChangeText={setQuery} placeholder="نام خادم" />

      {list.map((khadem) => (
        <Card key={khadem.id} className="flex-row items-center justify-between py-3">
          <View className="flex-row items-center gap-2">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: khadem.seniority === 'veteran' ? COLORS.ok : COLORS.line }}
            />
            <Txt weight="medium" className="text-[14px] text-ink">
              {khadem.fullName}
            </Txt>
            <Badge
              label={zones.find((z) => z.id === khadem.preferredZoneId)?.name ?? 'بدون ترجیح'}
              color={zones.find((z) => z.id === khadem.preferredZoneId)?.color}
            />
          </View>
          <View className="flex-row gap-2">
            <Pressable onPress={() => setDraft(khadem)}>
              <Txt className="text-[12px] text-ink">ویرایش</Txt>
            </Pressable>
            <Pressable
              onPress={() => {
                removeKhadem(khadem.id);
                toast('info', 'خادم حذف شد');
              }}
            >
              <Txt className="text-[12px]" style={{ color: COLORS.danger }}>
                حذف
              </Txt>
            </Pressable>
          </View>
        </Card>
      ))}

      {draft ? (
        <Card className="gap-3">
          <Field
            label="نام خادم"
            value={draft.fullName}
            onChangeText={(fullName) => setDraft({ ...draft, fullName })}
          />
          <Choice
            label="سطح سابقه"
            value={draft.seniority}
            options={[
              { value: 'veteran' as const, label: 'پیشکسوت' },
              { value: 'novice' as const, label: 'خادمیار تازه‌کار' },
            ]}
            onChange={(seniority) => setDraft({ ...draft, seniority })}
          />
          <Choice
            label="منطقه‌ی ترجیحی"
            value={draft.preferredZoneId ?? ''}
            options={[
              { value: '', label: 'بدون ترجیح' },
              ...zones.map((z) => ({ value: z.id, label: z.name })),
            ]}
            onChange={(preferredZoneId) =>
              setDraft({ ...draft, preferredZoneId: preferredZoneId || undefined })
            }
          />
          <Field
            label="نمره سختی انباشته از کشیک‌های گذشته"
            value={String(draft.historyHardship)}
            keyboardType="numeric"
            onChangeText={(v) => setDraft({ ...draft, historyHardship: Number(v) || 0 })}
          />
          <View className="flex-row gap-2">
            <Button
              title="ذخیره"
              className="flex-1"
              disabled={!draft.fullName.trim()}
              onPress={() => {
                upsertKhadem(draft);
                setDraft(undefined);
                toast('success', 'خادم ذخیره شد');
              }}
            />
            <Button title="انصراف" variant="secondary" className="flex-1" onPress={() => setDraft(undefined)} />
          </View>
        </Card>
      ) : (
        <Button
          title="افزودن خادم"
          variant="secondary"
          onPress={() =>
            setDraft({
              id: `k-${Date.now()}`,
              fullName: '',
              seniority: 'novice',
              historyHardship: 0,
            })
          }
        />
      )}
    </ScrollView>
  );
}

/**
 * گام ۴ — بازبینی، نهایی‌سازی و خروجی.
 * قبل از قفل شدن لوح، همه‌ی قیود سخت دوباره بررسی و کسری‌ها فهرست می‌شوند.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, SectionTitle, Txt } from '../../components/ui';
import { seedShiftMeta } from '../../domain/seed';
import { exportBoard } from '../../export/printBoard';
import { useEngineContext } from '../../hooks/useEngineContext';
import { fa } from '../../lib/format';
import { COLORS } from '../../lib/theme';
import { useDataStore } from '../../store/useDataStore';
import { useShiftStore } from '../../store/useShiftStore';

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const zones = useDataStore((s) => s.zones);
  const shift = useShiftStore((s) => s.shift);
  const meta = useShiftStore((s) => s.meta);
  const violations = useShiftStore((s) => s.violations);
  const finalize = useShiftStore((s) => s.finalize);
  const reopen = useShiftStore((s) => s.reopen);
  const [exporting, setExporting] = useState(false);

  const ctx = useEngineContext();

  if (!shift || !meta) {
    return (
      <View className="flex-1 justify-center p-6">
        <EmptyState title="هنوز لوحی تولید نشده است" body="ابتدا از صفحه‌ی لوح، برنامه را تولید کنید." />
      </View>
    );
  }

  const hardViolations = violations.filter((v) => v.code !== 'CRITICAL_UNDERSTAFFED');
  const criticalGaps = violations.filter((v) => v.code === 'CRITICAL_UNDERSTAFFED');
  const isFinal = shift.status === 'final';

  const onExport = async () => {
    setExporting(true);
    try {
      const result = await exportBoard(ctx, shift, {
        subtitle: seedShiftMeta.subtitle,
        weekday: seedShiftMeta.weekday,
        dedication: seedShiftMeta.dedication,
      });
      toast(result.ok ? 'success' : 'error', result.message ?? 'خروجی لوح آماده شد');
    } catch (error) {
      toast('error', `خطا در تولید خروجی: ${String(error)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <Card className="items-center">
        <Txt className="text-[12px] text-muted">شاخص عدالت توزیع</Txt>
        <Txt weight="bold" className="mt-1 text-[40px]" style={{ color: COLORS.ok }}>
          {fa(meta.fairnessScore)}٪
        </Txt>
        <Txt className="mt-1 text-[11px] text-muted">
          موتور در {fa(meta.elapsedMs)} میلی‌ثانیه چید
        </Txt>
        <View className="mt-3 flex-row gap-2">
          <Badge
            label={isFinal ? 'نهایی و قفل‌شده' : 'پیش‌نویس'}
            color={isFinal ? COLORS.ok : COLORS.muted}
            filled={isFinal}
          />
          <Badge label={`${fa(shift.assignments.length)} تخصیص`} />
        </View>
      </Card>

      <View>
        <SectionTitle hint="فاز ۱">تخصیص خادمان به مناطق</SectionTitle>
        <Card className="gap-2">
          {zones.map((zone) => (
            <View key={zone.id} className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
                <Txt weight="medium" className="text-[13px] text-ink">
                  {zone.name}
                </Txt>
              </View>
              <Txt className="text-[12px] text-muted">
                {fa(meta.headcount[zone.id] ?? 0)} نفر برای {fa(meta.demand[zone.id] ?? 0)} پست
              </Txt>
            </View>
          ))}
        </Card>
      </View>

      <View>
        <SectionTitle hint="قوانین سخت">نتیجه‌ی اعتبارسنجی</SectionTitle>
        {hardViolations.length === 0 ? (
          <Card className="flex-row items-center gap-2" style={{ borderColor: COLORS.ok }}>
            <Txt weight="bold" style={{ color: COLORS.ok }}>
              ✓
            </Txt>
            <Txt className="text-[13px] text-ink">هیچ قانون سختی نقض نشده است</Txt>
          </Card>
        ) : (
          <Card className="gap-2" style={{ borderColor: COLORS.danger }}>
            {hardViolations.slice(0, 20).map((v, i) => (
              <Txt key={i} className="text-[12px]" style={{ color: COLORS.danger }}>
                • {v.message}
              </Txt>
            ))}
          </Card>
        )}
      </View>

      {criticalGaps.length > 0 ? (
        <View>
          <SectionTitle hint="کمبود نیرو">پست‌های حیاتی بدون پوشش</SectionTitle>
          <Card className="gap-1.5" style={{ borderColor: COLORS.late }}>
            <Txt className="text-[12px] text-muted">
              سیستم به‌جای خروجی ناقص، دقیقاً کسری را گزارش می‌دهد:
            </Txt>
            {criticalGaps.slice(0, 20).map((v, i) => (
              <Txt key={i} className="text-[12px]" style={{ color: '#92400e' }}>
                • {v.message}
              </Txt>
            ))}
          </Card>
        </View>
      ) : null}

      <View className="gap-2">
        {isFinal ? (
          <Button title="بازگشایی برای ویرایش" variant="secondary" onPress={reopen} />
        ) : (
          <Button
            title="تأیید و قفل لوح"
            onPress={() => {
              finalize();
              toast('success', 'لوح نهایی شد و برای ویرایش قفل گردید');
            }}
          />
        )}
        <Button
          title="خروجی PDF / چاپ"
          variant="secondary"
          loading={exporting}
          onPress={onExport}
        />
      </View>
    </ScrollView>
  );
}

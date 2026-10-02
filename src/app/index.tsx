import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Card, SectionTitle, Txt } from '../components/ui';
import { seedShiftMeta } from '../domain/seed';
import { fa, todayJalali, weekdayFa } from '../lib/format';
import { COLORS } from '../lib/theme';
import { useDataStore } from '../store/useDataStore';
import { useShiftStore } from '../store/useShiftStore';

export default function Home() {
  const insets = useSafeAreaInsets();
  const zones = useDataStore((s) => s.zones);
  const khadems = useDataStore((s) => s.khadems);
  const posts = useDataStore((s) => s.posts);
  const shift = useShiftStore((s) => s.shift);
  const meta = useShiftStore((s) => s.meta);
  const summary = useShiftStore((s) => s.attendanceSummary)();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
    >
      <Card tone="dark">
        <Txt weight="bold" className="text-[18px] text-white text-right">
          {seedShiftMeta.title}
        </Txt>
        <Txt className="mt-1 text-[13px] text-white/70 text-right">
          {weekdayFa()} {todayJalali()} — {seedShiftMeta.subtitle}
        </Txt>
        <View className="mt-4 flex-row flex-wrap gap-2">
          <Badge label={`${fa(zones.length)} منطقه`} color="#ffffff" />
          <Badge label={`${fa(posts.filter((p) => p.kind === 'active').length)} پست`} color="#ffffff" />
          <Badge label={`${fa(khadems.length)} خادم`} color="#ffffff" />
        </View>
      </Card>

      <View>
        <SectionTitle hint="گام‌به‌گام">جریان کار سرگروه</SectionTitle>
        <View className="gap-3">
          <Step
            index={1}
            title="اعلام حضور"
            body={`${fa(summary.present)} آماده · ${fa(summary.leave)} مرخصی · ${fa(summary.late)} تأخیر`}
            href="/(leader)/attendance"
          />
          <Step
            index={2}
            title="تولید و ویرایش لوح"
            body={
              shift
                ? `لوح ${shift.status === 'final' ? 'نهایی' : 'پیش‌نویس'} آماده است — عدالت ${fa(meta?.fairnessScore ?? 0)}٪`
                : 'هنوز لوحی تولید نشده است'
            }
            href="/(leader)/schedule"
          />
          <Step
            index={3}
            title="بازبینی، نهایی‌سازی و خروجی"
            body="تأیید قوانین سخت، قفل لوح و چاپ"
            href="/(leader)/review"
          />
        </View>
      </View>

      <View>
        <SectionTitle hint="مدیر گروه">تعاریف پایه</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          <AdminLink href="/(admin)/zones" title="مناطق" value={fa(zones.length)} />
          <AdminLink href="/(admin)/posts" title="پست‌ها" value={fa(posts.length)} />
          <AdminLink href="/(admin)/khadems" title="خادمان" value={fa(khadems.length)} />
        </View>
      </View>
    </ScrollView>
  );
}

function Step({
  index,
  title,
  body,
  href,
}: {
  index: number;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href as never} asChild>
      <Card className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: COLORS.ink }}
        >
          <Txt weight="bold" className="text-[14px] text-white">
            {fa(index)}
          </Txt>
        </View>
        <View className="flex-1">
          <Txt weight="bold" className="text-[15px] text-ink text-right">
            {title}
          </Txt>
          <Txt className="mt-0.5 text-[12px] text-muted text-right">{body}</Txt>
        </View>
        <Txt className="text-[18px] text-muted">‹</Txt>
      </Card>
    </Link>
  );
}

function AdminLink({ href, title, value }: { href: string; title: string; value: string }) {
  return (
    <Link href={href as never} asChild>
      <Card className="flex-1 min-w-[100px] items-center">
        <Txt weight="bold" className="text-[20px] text-ink">
          {value}
        </Txt>
        <Txt className="mt-1 text-[12px] text-muted">{title}</Txt>
      </Card>
    </Link>
  );
}

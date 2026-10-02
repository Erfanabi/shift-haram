import {
  seedKhadems,
  seedPosts,
  seedShiftMeta,
  seedSignatures,
  seedTimeSlots,
  seedZones,
} from '../../domain/seed';
import { buildContext, generateSchedule } from '../../engine';
import { buildBoardHtml } from '../boardHtml';

const input = {
  zones: seedZones,
  posts: seedPosts,
  khadems: seedKhadems,
  slots: seedTimeSlots,
  attendance: [
    { khademId: seedKhadems[0]!.id, status: 'leave' as const },
    { khademId: seedKhadems[20]!.id, status: 'late' as const, availableFromSlotOrder: 3 },
  ],
};

const build = (zoneIds?: string[]) => {
  const ctx = buildContext(input);
  const { shift } = generateSchedule(input, {
    id: 'x',
    dateJalali: seedShiftMeta.dateJalali,
    title: seedShiftMeta.title,
    signatures: seedSignatures,
  });
  return buildBoardHtml(ctx, shift, {
    subtitle: seedShiftMeta.subtitle,
    weekday: seedShiftMeta.weekday,
    dedication: seedShiftMeta.dedication,
    zoneIds,
  });
};

describe('خروجی چاپی لوح', () => {
  it('سند راست‌به‌چپ با عنوان و تاریخ کشیک تولید می‌شود', () => {
    const html = build();
    expect(html).toContain('<html lang="fa" dir="rtl">');
    expect(html).toContain(seedShiftMeta.title);
    expect(html).toContain(seedShiftMeta.dateJalali);
  });

  it('یک صفحه به ازای هر منطقه، با نام همه‌ی پست‌های آن منطقه', () => {
    const html = build();
    expect(html.match(/class="page"/g)).toHaveLength(seedZones.length);
    for (const zone of seedZones) expect(html).toContain(zone.name);
    for (const post of seedPosts) expect(html).toContain(post.name);
  });

  it('فقط مناطق خواسته‌شده چاپ می‌شوند', () => {
    const html = build(['z5']);
    expect(html.match(/class="page"/g)).toHaveLength(1);
    expect(html).toContain('منطقه پنج');
    expect(html).not.toContain('رواق حضرت معصومه(س)');
  });

  it('ردیف‌های امضا، مرخصی و تأخیر در پای لوح می‌آیند', () => {
    const html = build();
    expect(html).toContain(seedSignatures.shiftChief!);
    expect(html).toContain('مرخصی‌ها:');
    expect(html).toContain('تأخیرها:');
    expect(html).toContain(seedKhadems[0]!.fullName);
  });

  it('محتوای ورودی به‌صورت امن اسکیپ می‌شود', () => {
    const ctx = buildContext(input);
    const { shift } = generateSchedule(input, {
      id: 'x',
      dateJalali: '۱',
      title: '<script>bad</script>',
    });
    const html = buildBoardHtml(ctx, shift);
    expect(html).not.toContain('<script>bad</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

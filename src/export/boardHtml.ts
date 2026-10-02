/**
 * بازسازی لوح سنتی کشیک به‌صورت HTML راست‌به‌چپ، آماده‌ی چاپ و PDF.
 * یک صفحه به ازای هر منطقه، تا هر سرگروه فقط برگه‌ی تیم خودش را بردارد.
 */
import type { Attendance, Post, Shift, TimeSlot, Zone } from '../domain/types';
import type { EngineContext } from '../engine';

const escape = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

interface Options {
  subtitle?: string;
  weekday?: string;
  dedication?: string;
  /** فقط این مناطق چاپ شوند (پیش‌فرض: همه) */
  zoneIds?: string[];
}

export function buildBoardHtml(ctx: EngineContext, shift: Shift, options: Options = {}): string {
  const zones = ctx.zones.filter((z) => !options.zoneIds || options.zoneIds.includes(z.id));
  const slots = ctx.slotsOrdered;

  const onLeave = [...ctx.attendanceOf.values()].filter(
    (a: Attendance) => a.status === 'leave',
  );
  const late = [...ctx.attendanceOf.values()].filter((a: Attendance) => a.status === 'late');
  const nameOf = (id: string) => ctx.khademById.get(id)?.fullName ?? id;

  const pages = zones.map((zone) => renderZonePage(ctx, shift, zone, slots, options, onLeave, late, nameOf));

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(shift.title)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Vazirmatn, "IRANSans", Tahoma, sans-serif;
    direction: rtl; margin: 0; color: #1f2430; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { page-break-after: always; padding: 4mm 0; }
  .page:last-child { page-break-after: auto; }
  .head { text-align: center; border: 2px solid #1f2430; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .head h1 { margin: 0; font-size: 17px; }
  .head .meta { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: #444; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #94a0b0; padding: 4px 3px; font-size: 10.5px; text-align: center; vertical-align: middle; }
  thead th { background: #fdf6d8; font-weight: 700; font-size: 11px; }
  .zone-band { color: #fff; font-weight: 700; font-size: 12px; }
  .post { text-align: right; font-weight: 600; font-size: 10.5px; }
  .rest { background: #e8eef5; color: #4b5563; }
  .empty { color: #b91c1c; }
  .seat { display: block; line-height: 1.6; }
  .footer { margin-top: 8px; border: 1px solid #94a0b0; border-radius: 4px; font-size: 10.5px; }
  .footer div { padding: 4px 6px; border-bottom: 1px solid #d8dde5; display: flex; gap: 16px; }
  .footer div:last-child { border-bottom: none; }
  .footer b { font-weight: 700; }
  .note { margin-top: 6px; text-align: center; font-size: 10px; color: #b45309; }
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}

function renderZonePage(
  ctx: EngineContext,
  shift: Shift,
  zone: Zone,
  slots: TimeSlot[],
  options: Options,
  onLeave: Attendance[],
  late: Attendance[],
  nameOf: (id: string) => string,
): string {
  const posts = (ctx.postsByZone.get(zone.id) ?? []).filter((p) => p.kind === 'active');
  const restPost = ctx.restPostOf.get(zone.id);

  const row = (post: Post) => {
    const cells = slots
      .map((slot) => {
        const occupants = shift.assignments
          .filter((a) => a.postId === post.id && a.slotId === slot.id)
          .map((a) => nameOf(a.khademId));
        const seats = Array.from({ length: post.capacity }, (_, i) => occupants[i]);
        const body = seats
          .map((n) =>
            n
              ? `<span class="seat">${escape(n)}</span>`
              : `<span class="seat empty">${post.isCritical ? 'خالی!' : '—'}</span>`,
          )
          .join('');
        return `<td>${body}</td>`;
      })
      .join('');
    return `<tr><td class="post" style="background:${zone.color}1a">${escape(post.name)}</td>${cells}</tr>`;
  };

  const restRow = restPost
    ? `<tr><td class="post rest">${escape(restPost.name)}</td>${slots
        .map((slot) => {
          const names = shift.assignments
            .filter((a) => a.postId === restPost.id && a.slotId === slot.id)
            .map((a) => nameOf(a.khademId));
          return `<td class="rest">${names.map((n) => `<span class="seat">${escape(n)}</span>`).join('') || '—'}</td>`;
        })
        .join('')}</tr>`
    : '';

  const sig = shift.signatures ?? {};
  const leaveNames = onLeave.map((a) => nameOf(a.khademId)).join('، ') || '—';
  const lateNames = late.map((a) => nameOf(a.khademId)).join('، ') || '—';

  return `<section class="page">
  <div class="head">
    <h1>${escape(shift.title)}</h1>
    <div class="meta">
      <span>${escape(options.weekday ?? '')} ${escape(shift.dateJalali)}</span>
      <span>${escape(options.subtitle ?? '')}</span>
      <span>${escape(zone.name)}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:26%;background:${zone.color}" class="zone-band">${escape(zone.name)}</th>
        ${slots.map((s) => `<th>${escape(s.label)}</th>`).join('')}
      </tr>
      ${options.dedication ? `<tr><th colspan="${slots.length + 1}" style="background:#fdf6d8;font-weight:600">${escape(options.dedication)}</th></tr>` : ''}
    </thead>
    <tbody>
      ${posts.map(row).join('')}
      ${restRow}
    </tbody>
  </table>
  <div class="footer">
    <div><b>رئیس کشیک:</b> ${escape(sig.shiftChief ?? '—')} <b>معاون کشیک:</b> ${escape(sig.deputy ?? '—')}</div>
    <div><b>مسئول شیفت:</b> ${escape(sig.shiftManager ?? '—')} <b>میزبان:</b> ${escape(sig.host ?? '—')} <b>مرخص:</b> ${escape(sig.reciter ?? '—')}</div>
    <div><b>مرخصی‌ها:</b> ${escape(leaveNames)}</div>
    <div><b>تأخیرها:</b> ${escape(lateNames)}</div>
  </div>
  <p class="note">لطفاً دوستان پاس یک، ساعت ۵:۳۰ و پاس دو، ساعت ۷ صبح در آسایشگاه حضور داشته باشند.</p>
</section>`;
}

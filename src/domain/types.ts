/**
 * مدل دامنه‌ی شیفت‌بندی ناحیه‌محور.
 *
 * سلسله‌مراتب مکانی: حرم مطهر ← منطقه (Zone) ← پست (Post)
 * هر شیفت به بازه‌های زمانی دو ساعته (TimeSlot) تقسیم می‌شود.
 */

export type ZoneId = string;
export type PostId = string;
export type KhademId = string;
export type SlotId = string;

/** سطح سابقه: پیشکسوت / خادمیار تازه‌کار */
export type Seniority = 'veteran' | 'novice';

/** وضعیت اعلام حضور برای یک کشیک */
export type AttendanceStatus = 'present' | 'leave' | 'late';

/** ضریب سختی پست: آسایشگاه ۰، رواق مسقف ۲، صحن باز ۵ */
export type Hardship = 0 | 1 | 2 | 3 | 5;

/** نوع پست: فعال (خدمت) یا استراحت (آسایشگاه همان منطقه) */
export type PostKind = 'active' | 'rest';

export interface Zone {
  id: ZoneId;
  /** نام نمایشی، مثلاً «منطقه یک و دو» */
  name: string;
  /** ترتیب نمایش در تب‌ها و لوح چاپی */
  order: number;
  /** رنگ نوار منطقه در لوح، مطابق لوح سنتی */
  color: string;
}

export interface Post {
  id: PostId;
  zoneId: ZoneId;
  name: string;
  /** تعداد خادم موردنیاز در هر بازه زمانی */
  capacity: number;
  hardship: Hardship;
  /** پست حیاتی هرگز خالی نمی‌ماند؛ پست شناور در کمبود نیرو خالی می‌ماند */
  isCritical: boolean;
  kind: PostKind;
  /** پست حساس: باید ترکیب تجربه (یک باتجربه + یک تازه‌کار) داشته باشد */
  requiresExperienceMix?: boolean;
  order: number;
}

export interface Khadem {
  id: KhademId;
  fullName: string;
  seniority: Seniority;
  /** منطقه‌ی ترجیحی (سابقه‌ی کشیک‌های قبلی) — قید نرم */
  preferredZoneId?: ZoneId;
  /** مجموع نمره سختی کشیک‌های گذشته — برای عدالت بین‌کشیکی */
  historyHardship: number;
}

export interface TimeSlot {
  id: SlotId;
  /** برچسب فارسی، مثلاً «۶-۸» */
  label: string;
  startHour: number;
  endHour: number;
  order: number;
  /** بازه‌ی هم‌زمان با اذان و نماز — برای توزیع چرخشی استراحت */
  isPrayerWindow?: boolean;
}

export interface Attendance {
  khademId: KhademId;
  status: AttendanceStatus;
  /** برای وضعیت «تأخیر»: از کدام بازه به بعد در دسترس است */
  availableFromSlotOrder?: number;
}

/** یک خانه از لوح: فلان خادم، در فلان پست، در فلان بازه */
export interface Assignment {
  khademId: KhademId;
  postId: PostId;
  slotId: SlotId;
}

export type ShiftStatus = 'draft' | 'final';

export interface Shift {
  id: string;
  /** تاریخ شمسی، مثلاً «۱۴۰۵/۰۷/۰۶» */
  dateJalali: string;
  title: string;
  status: ShiftStatus;
  /** قفل جغرافیایی فاز ۱: هر خادم دقیقاً یک منطقه */
  zoneOf: Record<KhademId, ZoneId>;
  assignments: Assignment[];
  /** امضاهای پای لوح */
  signatures?: {
    shiftChief?: string;
    deputy?: string;
    shiftManager?: string;
    host?: string;
    reciter?: string;
  };
}

/** کلید یکتای یک خانه‌ی جدول */
export type CellKey = `${PostId}|${SlotId}`;

export const cellKey = (postId: PostId, slotId: SlotId): CellKey => `${postId}|${slotId}`;

export const parseCellKey = (key: CellKey): { postId: PostId; slotId: SlotId } => {
  const [postId, slotId] = key.split('|');
  return { postId: postId!, slotId: slotId! };
};

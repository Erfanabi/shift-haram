import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Shift } from '../domain/types';
import type { EngineContext } from '../engine';
import { buildBoardHtml } from './boardHtml';

export interface PrintOptions {
  subtitle?: string;
  weekday?: string;
  dedication?: string;
  zoneIds?: string[];
}

/** تولید PDF لوح و باز کردن برگه‌ی اشتراک‌گذاری؛ روی وب مستقیم چاپ می‌کند. */
export async function exportBoard(
  ctx: EngineContext,
  shift: Shift,
  options: PrintOptions = {},
): Promise<{ ok: boolean; uri?: string; message?: string }> {
  const html = buildBoardHtml(ctx, shift, options);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return { ok: true };
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'لوح خدمت کشیک',
      UTI: 'com.adobe.pdf',
    });
    return { ok: true, uri };
  }
  return { ok: true, uri, message: 'فایل ساخته شد اما اشتراک‌گذاری در دسترس نیست' };
}

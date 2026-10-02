import { Pressable, View } from 'react-native';

import { COLORS } from '../lib/theme';
import { Txt } from './ui';

export type CardTone = 'active' | 'rest' | 'late';

interface Props {
  name: string;
  tone: CardTone;
  /** کارت انتخاب‌شده (مبدأ جابه‌جایی) */
  selected?: boolean;
  /** این خانه بخشی از مسیر روزانه‌ی خادم انتخاب‌شده است (Smart Highlight) */
  onJourney?: boolean;
  /** هنگام انتخاب بودنِ خادم دیگر، بقیه کم‌رنگ می‌شوند */
  dimmed?: boolean;
  veteran?: boolean;
  compact?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function KhademCard({
  name,
  tone,
  selected,
  onJourney,
  dimmed,
  veteran,
  compact,
  onPress,
  disabled,
}: Props) {
  const background =
    tone === 'rest' ? COLORS.rest : tone === 'late' ? '#fff7ed' : '#ffffff';
  const borderColor = selected
    ? COLORS.ink
    : onJourney
      ? COLORS.highlight
      : tone === 'late'
        ? COLORS.late
        : COLORS.line;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 justify-center rounded-lg px-2 ${compact ? 'py-1' : 'py-1.5'}`}
      style={{
        backgroundColor: background,
        borderWidth: selected ? 2 : 1,
        borderColor,
        opacity: dimmed ? 0.35 : 1,
      }}
    >
      <View className="flex-row items-center gap-1">
        {veteran ? (
          <View
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: COLORS.ok }}
          />
        ) : null}
        <Txt
          weight={selected ? 'bold' : 'medium'}
          numberOfLines={1}
          className={`${compact ? 'text-[11px]' : 'text-[12px]'} text-ink flex-1 text-center`}
        >
          {name}
        </Txt>
      </View>
    </Pressable>
  );
}

/** صندلی خالی یک پست */
export function EmptySeat({
  critical,
  legal,
  onPress,
}: {
  critical: boolean;
  legal: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center rounded-lg"
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: legal ? COLORS.ok : critical ? COLORS.danger : COLORS.line,
        backgroundColor: legal ? '#16a34a14' : critical ? '#dc262610' : 'transparent',
      }}
    >
      <Txt
        className="text-[11px]"
        style={{ color: legal ? COLORS.ok : critical ? COLORS.danger : COLORS.muted }}
      >
        {legal ? 'اینجا' : critical ? 'خالی!' : '—'}
      </Txt>
    </Pressable>
  );
}

import { Pressable, TextInput, View } from 'react-native';

import { COLORS } from '../lib/theme';
import { Txt } from './ui';

export function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
}) {
  return (
    <View className="gap-1">
      <Txt className="text-[12px] text-muted text-right">{label}</Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        className="rounded-xl border border-[#d8dde5] bg-white px-3 py-2.5 text-[14px] text-ink"
        style={{ fontFamily: 'Vazirmatn', textAlign: 'right', writingDirection: 'rtl' }}
      />
    </View>
  );
}

export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-1">
      <Txt className="text-[12px] text-muted text-right">{label}</Txt>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              className="rounded-lg px-3 py-2"
              style={{
                backgroundColor: active ? COLORS.ink : '#fff',
                borderWidth: 1,
                borderColor: active ? COLORS.ink : COLORS.line,
              }}
            >
              <Txt
                weight={active ? 'bold' : 'regular'}
                className="text-[12px]"
                style={{ color: active ? '#fff' : COLORS.ink }}
              >
                {option.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className="flex-row items-center justify-between rounded-xl border border-[#d8dde5] bg-white px-3 py-2.5"
    >
      <Txt className="text-[13px] text-ink">{label}</Txt>
      <View
        className="h-6 w-11 justify-center rounded-full px-0.5"
        style={{ backgroundColor: value ? COLORS.ok : '#d8dde5' }}
      >
        <View
          className="h-5 w-5 rounded-full bg-white"
          style={{ alignSelf: value ? 'flex-start' : 'flex-end' }}
        />
      </View>
    </Pressable>
  );
}

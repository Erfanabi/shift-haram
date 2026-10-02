import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from 'react-native';

type Weight = 'regular' | 'medium' | 'bold';

const FONT: Record<Weight, string> = {
  regular: 'Vazirmatn',
  medium: 'VazirmatnMedium',
  bold: 'VazirmatnBold',
};

/** متن فارسی با فونت وزیرمتن و چینش راست‌چین */
export function Txt({
  weight = 'regular',
  style,
  ...props
}: TextProps & { weight?: Weight }) {
  return (
    <RNText
      {...props}
      style={[{ fontFamily: FONT[weight], writingDirection: 'rtl' }, style]}
    />
  );
}

export function Card({
  className = '',
  tone = 'light',
  ...props
}: ViewProps & { className?: string; tone?: 'light' | 'dark' }) {
  // رنگ پس‌زمینه را اینلاین می‌دهیم تا با کلاس‌های دلخواه فراخوان تداخل نکند
  return (
    <View
      {...props}
      className={`rounded-2xl p-4 border ${className}`}
      style={[
        tone === 'dark'
          ? { backgroundColor: '#1f2430', borderColor: '#1f2430' }
          : { backgroundColor: '#ffffff', borderColor: '#e6e9ef' },
        props.style,
      ]}
    />
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT: Record<ButtonVariant, { box: string; text: string }> = {
  primary: { box: 'bg-ink', text: 'text-white' },
  secondary: { box: 'bg-white border border-[#d8dde5]', text: 'text-ink' },
  danger: { box: 'bg-danger', text: 'text-white' },
  ghost: { box: 'bg-transparent', text: 'text-ink' },
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const style = VARIANT[variant];
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 ${style.box} ${
        disabled || loading ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : icon}
      <Txt weight="bold" className={`text-[15px] ${style.text}`}>
        {title}
      </Txt>
    </Pressable>
  );
}

export function Badge({
  label,
  color = '#6b7280',
  filled = false,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{
        backgroundColor: filled ? color : `${color}1a`,
        borderWidth: filled ? 0 : 1,
        borderColor: `${color}55`,
      }}
    >
      <Txt weight="medium" className="text-[11px]" style={{ color: filled ? '#fff' : color }}>
        {label}
      </Txt>
    </View>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View className="mb-3 flex-row items-baseline justify-between">
      <Txt weight="bold" className="text-[17px] text-ink">
        {children}
      </Txt>
      {hint ? <Txt className="text-[12px] text-muted">{hint}</Txt> : null}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="items-center justify-center rounded-2xl border border-dashed border-[#d8dde5] bg-white/60 px-6 py-10">
      <Txt weight="bold" className="text-[15px] text-ink text-center">
        {title}
      </Txt>
      {body ? (
        <Txt className="mt-2 text-[13px] text-muted text-center leading-6">{body}</Txt>
      ) : null}
    </View>
  );
}

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { COLORS } from '../lib/theme';
import { Txt } from './ui';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

const TONE: Record<ToastKind, { bg: string; icon: string }> = {
  success: { bg: COLORS.ok, icon: '✓' },
  error: { bg: COLORS.danger, icon: '⛔' },
  info: { bg: COLORS.ink, icon: 'ℹ' },
};

const ToastContext = createContext<(kind: ToastKind, text: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const show = useCallback((kind: ToastKind, text: string) => {
    const id = nextId.current++;
    setMessages((prev) => [...prev.slice(-2), { id, kind, text }]);
    setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== id)), 2600);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" className="absolute inset-x-0 top-2 items-center gap-2 px-4">
        {messages.map((m) => (
          <Animated.View
            key={m.id}
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(160)}
            className="flex-row items-center gap-2 rounded-xl px-4 py-2.5 shadow-lg"
            style={{ backgroundColor: TONE[m.kind].bg }}
          >
            <Txt weight="bold" className="text-white text-[13px]">
              {TONE[m.kind].icon}
            </Txt>
            <Txt weight="medium" className="text-white text-[13px]">
              {m.text}
            </Txt>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

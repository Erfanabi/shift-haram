import '../../global.css';

import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
} from '@expo-google-fonts/vazirmatn';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '../components/Toast';
import { enableRtl } from '../lib/rtl';
import { COLORS } from '../lib/theme';

enableRtl();
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Vazirmatn: Vazirmatn_400Regular,
    VazirmatnMedium: Vazirmatn_500Medium,
    VazirmatnBold: Vazirmatn_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ToastProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.ink },
            headerTintColor: '#fff',
            headerTitleStyle: { fontFamily: 'VazirmatnBold', fontSize: 16 },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: COLORS.paper },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'شیفت‌بندی هوشمند خادمان' }} />
          <Stack.Screen name="(leader)/attendance" options={{ title: 'اعلام حضور' }} />
          <Stack.Screen name="(leader)/schedule" options={{ title: 'لوح خدمت' }} />
          <Stack.Screen name="(leader)/review" options={{ title: 'بازبینی و نهایی‌سازی' }} />
          <Stack.Screen name="(admin)/zones" options={{ title: 'مناطق' }} />
          <Stack.Screen name="(admin)/posts" options={{ title: 'پست‌ها' }} />
          <Stack.Screen name="(admin)/khadems" options={{ title: 'خادمان' }} />
        </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

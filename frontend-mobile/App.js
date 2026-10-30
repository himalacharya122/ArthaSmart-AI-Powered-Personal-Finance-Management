/**
 * Squirrel Mobile App — Root Component
 *
 * Sets up:
 * - SafeAreaProvider (for notch/status bar handling)
 * - NavigationContainer (React Navigation)
 * - Network listener (offline detection)
 * - Toast overlay
 * - Auth initialization on launch
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastContainer } from './src/components/common/Toast';
import { OfflineBanner } from './src/components/common/OfflineBanner';
import { useAuthStore } from './src/store/authStore';
import { useAppStore } from './src/store/appStore';
import { MANROPE_FONTS } from './src/theme/fonts';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const setOnline = useAppStore((s) => s.setOnline);

  const [fontsLoaded] = useFonts(MANROPE_FONTS);

  useEffect(() => {
    initialize();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  // Hold the app off until fonts are ready so we don't flash system font
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <OfflineBanner />
        <RootNavigator />
        <ToastContainer />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

/**
 * ArthaSmart Mobile App — Root Component
 *
 * Sets up:
 * - SafeAreaProvider (for notch/status bar handling)
 * - NavigationContainer (React Navigation)
 * - Network listener (offline detection)
 * - Toast overlay
 * - Auth initialization on launch
 */
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastContainer } from './src/components/common/Toast';
import { OfflineBanner } from './src/components/common/OfflineBanner';
import { useAuthStore } from './src/store/authStore';
import { useAppStore } from './src/store/appStore';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    // Initialize auth (load stored tokens)
    initialize();

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

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

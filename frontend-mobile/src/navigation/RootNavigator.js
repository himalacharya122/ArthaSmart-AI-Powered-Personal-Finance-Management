/**
 * Root navigator: switches between Auth, Biometric Lock, Biometric Setup, and Main flows.
 */
import { useEffect, useRef } from 'react';
import { AppState, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { BiometricLockScreen } from '../screens/auth/BiometricLockScreen';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';
import { initNetworkMonitor } from '../services/offline';

// Start network monitoring once on import
initNetworkMonitor();

export function RootNavigator() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const biometricUnlocked = useAuthStore((s) => s.biometricUnlocked);
  const showBiometricSetup = useAuthStore((s) => s.showBiometricSetup);
  const lockBiometric = useAuthStore((s) => s.lockBiometric);

  // Lock when app goes to background
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        lockBiometric();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [lockBiometric]);

  if (isLoading) {
    return <LoadingSpinner message="Loading ArthaSmart..." />;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Show biometric lock if enabled and not yet unlocked this session
  if (biometricEnabled && !biometricUnlocked) {
    return <BiometricLockScreen />;
  }

  // Show biometric setup prompt (once, after first login) if applicable
  if (showBiometricSetup) {
    return <BiometricSetupScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <MainTabs />
    </View>
  );
}

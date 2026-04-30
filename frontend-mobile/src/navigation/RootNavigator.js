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

  // Re-lock biometric only after a meaningful idle period in the background.
  // Behaviour matches industry standard (Revolut, Monzo, banking apps):
  //   - "inactive" (notification pull, app switcher peek) is ignored
  //   - "background" starts a timer; if user returns within RELOCK_AFTER_MS we don't
  //     re-lock, so brief context switches don't blow away the screen they were on
  //     (which would unmount in-flight edits like a half-completed receipt review).
  //   - If user stays away longer than threshold, we re-lock on next foreground.
  const RELOCK_AFTER_MS = 5 * 60 * 1000; // 5 minutes
  const appState = useRef(AppState.currentState);
  const backgroundedAt = useRef(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appState.current;

      // Going to background -> start the idle timer
      if (prev === 'active' && nextState === 'background') {
        backgroundedAt.current = Date.now();
      }

      // Coming back to foreground -> re-lock only if idle long enough
      if (nextState === 'active' && prev !== 'active') {
        const since = backgroundedAt.current
          ? Date.now() - backgroundedAt.current
          : 0;
        if (since >= RELOCK_AFTER_MS) {
          lockBiometric();
        }
        backgroundedAt.current = null;
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

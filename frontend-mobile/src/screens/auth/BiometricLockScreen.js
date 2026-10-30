/**
 * BiometricLockScreen, Shown when the app requires biometric unlock.
 *
 * Displays a branded lock screen with a fingerprint/face button.
 * Auto-prompts biometric auth on mount. Can retry or logout.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import * as biometricService from '../../services/biometric';

export function BiometricLockScreen() {
  const unlockBiometric = useAuthStore((s) => s.unlockBiometric);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [error, setError] = useState(null);

  useEffect(() => {
    biometricService.getBiometricLabel().then(setBiometricLabel);
  }, []);

  const handleUnlock = useCallback(async () => {
    setError(null);
    const result = await biometricService.authenticate('Unlock Squirrel');
    if (result.success) {
      unlockBiometric();
    } else if (result.error) {
      setError('Authentication failed. Try again.');
    }
  }, [unlockBiometric]);

  // Auto-prompt on mount
  useEffect(() => {
    const timer = setTimeout(handleUnlock, 500);
    return () => clearTimeout(timer);
  }, [handleUnlock]);

  const handleLogout = async () => {
    try { await logout(); } catch { /* silent */ }
  };

  const firstName = user?.first_name || 'there';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* User avatar / icon */}
        <View style={styles.avatarCircle}>
          <MaterialIcons name="lock" size={36} color={colors.white} />
        </View>

        <Text style={styles.greeting}>Welcome back, {firstName}</Text>
        <Text style={styles.subtitle}>Use {biometricLabel} to unlock Squirrel</Text>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Unlock button */}
        <TouchableOpacity style={styles.unlockBtn} activeOpacity={0.8} onPress={handleUnlock}>
          <MaterialIcons name="fingerprint" size={28} color={colors.white} />
          <Text style={styles.unlockBtnText}>Unlock with {biometricLabel}</Text>
        </TouchableOpacity>

        {/* Logout fallback */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign out instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[900] },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },

  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },

  greeting: {
    ...typography.h2, color: colors.white, textAlign: 'center', marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorText: {
    ...typography.bodySmall, color: colors.danger[400], textAlign: 'center',
    marginBottom: spacing.md,
  },

  unlockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accent[600], paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl, borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  unlockBtnText: { ...typography.button, color: colors.white, fontSize: 16 },

  logoutBtn: { paddingVertical: spacing.sm },
  logoutBtnText: { ...typography.bodySmall, color: 'rgba(255,255,255,0.4)' },
});

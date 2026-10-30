import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import * as biometricService from '../../services/biometric';

export function BiometricSetupScreen() {
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const dismissBiometricSetup = useAuthStore((s) => s.dismissBiometricSetup);
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [biometricIcon, setBiometricIcon] = useState('fingerprint');

  useEffect(() => {
    (async () => {
      try {
        const label = await biometricService.getBiometricLabel();
        setBiometricLabel(label);
        if (label === 'Face ID') setBiometricIcon('face');
      } catch { /* silent */ }
    })();
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await biometricService.authenticate(`Enable ${biometricLabel} for Squirrel`);
      if (result.success) {
        await setBiometricEnabled(true);
        showToast(`${biometricLabel} login enabled!`, 'success');
        await dismissBiometricSetup();
      } else {
        showToast('Authentication cancelled. You can enable this later in Settings.', 'info', 3000);
      }
    } catch {
      showToast('Could not enable biometric. Try again in Settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await dismissBiometricSetup();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Biometric icon circle */}
        <View style={styles.iconSection}>
          <View style={styles.iconOuterRing}>
            <View style={styles.iconInnerCircle}>
              <MaterialIcons name={biometricIcon} size={44} color={colors.primary[600]} />
            </View>
          </View>
        </View>

        {/* Text content */}
        <Text style={styles.eyebrow}>ONE LAST STEP</Text>
        <Text style={styles.title}>Enable {biometricLabel === 'Biometric' ? 'biometric' : biometricLabel}{'\n'}login</Text>
        <Text style={styles.subtitle}>
          Use {biometricLabel === 'Face ID' ? 'Face ID or your fingerprint' : 'your fingerprint or face'} to open Squirrel
          instantly. No password needed each time.
        </Text>

        {/* Feature cards */}
        <View style={styles.featureList}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconBg}>
              <MaterialIcons name="lock-open" size={20} color={colors.primary[700]} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Instant secure access</Text>
              <Text style={styles.featureDesc}>No typing your password each time</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconBg}>
              <MaterialIcons name="verified-user" size={20} color={colors.primary[700]} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Bank-grade protection</Text>
              <Text style={styles.featureDesc}>Your data stays encrypted on device</Text>
            </View>
          </View>
        </View>

        {/* Enable button */}
        <TouchableOpacity
          style={[styles.enableBtn, loading && { opacity: 0.7 }]}
          onPress={handleEnable}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <MaterialIcons name={biometricIcon} size={20} color={colors.white} />
          )}
          <Text style={styles.enableBtnText}>
            {loading ? 'Setting up...' : `Enable ${biometricLabel === 'Biometric' ? 'biometrics' : biometricLabel}`}
          </Text>
        </TouchableOpacity>

        {/* Skip link */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.6}>
          <Text style={styles.skipText}>Skip for now — I'll do this later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },

  // Icon
  iconSection: {
    marginBottom: spacing.xl,
  },
  iconOuterRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconInnerCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
  },

  // Text
  eyebrow: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary[400],
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.body,
    color: colors.primary[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },

  // Feature cards
  featureList: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    padding: spacing.md,
    gap: spacing.md,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary[800],
    marginBottom: 2,
  },
  featureDesc: {
    ...typography.caption,
    color: colors.primary[400],
    lineHeight: 16,
  },

  // Buttons
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[900],
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    width: '100%',
    marginBottom: spacing.md,
  },
  enableBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.body,
    color: colors.primary[500],
    textAlign: 'center',
  },
});

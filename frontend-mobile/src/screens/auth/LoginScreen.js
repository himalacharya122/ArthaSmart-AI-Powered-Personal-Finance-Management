import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { emailRules, passwordRules } from '../../utils/validators';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import * as biometricService from '../../services/biometric';
import { useGoogleAuthRequest } from '../../services/googleAuth';

export function LoginScreen({ navigation }) {
  const login = useAuthStore((s) => s.login);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const biometricLogin = useAuthStore((s) => s.biometricLogin);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  // Google OAuth hook
  const [googleRequest, googleResponse, promptGoogleAsync] = useGoogleAuthRequest();

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      if (token) {
        handleGoogleToken(token);
      }
    } else if (googleResponse?.type === 'error') {
      showToast('Google sign-in failed. Try again.', 'error');
      setGoogleLoading(false);
    } else if (googleResponse?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [googleResponse]);

  const handleGoogleToken = async (token) => {
    setGoogleLoading(true);
    try {
      await googleLogin(token);
      checkBiometricPrompt();
    } catch (error) {
      let message = 'Google sign-in failed.';
      if (error?.response?.data?.detail) message = error.response.data.detail;
      showToast(message, 'error', 4000);
    } finally {
      setGoogleLoading(false);
    }
  };
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [biometricUserName, setBiometricUserName] = useState('');

  // Check if biometric login is available on mount
  useEffect(() => {
    (async () => {
      try {
        const { storage } = require('../../utils/storage');
        const [bioEnabled, bioToken, bioUser, support] = await Promise.all([
          storage.isBiometricEnabled(),
          storage.getBiometricRefreshToken(),
          storage.getBiometricUser(),
          biometricService.checkBiometricSupport(),
        ]);
        if (bioEnabled && bioToken && bioUser && support.available && support.enrolled) {
          setHasBiometricCredentials(true);
          setBiometricUserName(bioUser.first_name || bioUser.email?.split('@')[0] || '');
          const label = await biometricService.getBiometricLabel();
          setBiometricLabel(label);
        }
      } catch { /* silent */ }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      const result = await biometricService.authenticate(`Sign in to ArthaSmart`);
      if (!result.success) {
        showToast('Authentication cancelled', 'info');
        return;
      }
      setLoading(true);
      await biometricLogin();
      // Navigation happens automatically via RootNavigator
    } catch (error) {
      // Biometric token might be expired/blacklisted — clear and fall back to password
      try {
        const { storage } = require('../../utils/storage');
        await storage.clearBiometricCredentials();
      } catch { /* ignore */ }
      setHasBiometricCredentials(false);
      showToast('Session expired. Please sign in with your password.', 'info', 3000);
    } finally {
      setLoading(false);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const checkBiometricPrompt = async () => {
    if (biometricEnabled) return;
    const support = await biometricService.checkBiometricSupport();
    if (support.available && support.enrolled) {
      setShowBiometricPrompt(true);
    }
  };

  const handleEnableBiometric = async () => {
    const label = await biometricService.getBiometricLabel();
    const result = await biometricService.authenticate(`Enable ${label} for ArthaSmart`);
    if (result.success) {
      await setBiometricEnabled(true);
      showToast(`${label} lock enabled!`, 'success');
    }
    setShowBiometricPrompt(false);
  };

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      await login(email, password);
      checkBiometricPrompt();
      // Navigation happens automatically via RootNavigator (isAuthenticated → MainTabs)
    } catch (error) {
      let message = 'Something went wrong. Please try again.';

      if (error?.response?.data) {
        const d = error.response.data;
        if (typeof d.detail === 'string') message = d.detail;
        else if (Array.isArray(d.detail)) message = d.detail[0];
        else if (d.non_field_errors) message = d.non_field_errors[0];
        else if (d.error) message = d.error;
      } else if (error?.message?.includes('Network Error')) {
        message = 'Cannot reach server. Make sure the backend is running and your device is on the same network.';
      } else if (error?.code === 'ECONNABORTED') {
        message = 'Request timed out. Please check your connection.';
      }

      showToast(message, 'error', 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleRequest) {
      showToast('Google Sign-In not available', 'error');
      return;
    }
    setGoogleLoading(true);
    try {
      await promptGoogleAsync();
    } catch {
      showToast('Google Sign-In failed', 'error');
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="account-balance-wallet" size={40} color={colors.accent[600]} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue managing your finances</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              rules={emailRules}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="email"
                  autoComplete="email"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={passwordRules}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  secureTextEntry
                  leftIcon="lock"
                  autoComplete="password"
                />
              )}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate(SCREEN_NAMES.FORGOT_PASSWORD)}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              variant="accent"
              size="lg"
              fullWidth
              loading={loading}
              style={styles.signInButton}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Biometric Login (shown if user previously enabled biometric) */}
          {hasBiometricCredentials && (
            <TouchableOpacity style={styles.biometricLoginBtn} onPress={handleBiometricLogin} activeOpacity={0.7}>
              <MaterialIcons name="fingerprint" size={24} color={colors.accent[600]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.biometricLoginText}>Sign in with {biometricLabel}</Text>
                {biometricUserName ? (
                  <Text style={styles.biometricLoginSub}>as {biometricUserName}</Text>
                ) : null}
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.accent[400]} />
            </TouchableOpacity>
          )}

          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && { opacity: 0.6 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.primary[700]} />
            ) : (
              <MaterialIcons name="g-mobiledata" size={24} color={colors.primary[700]} />
            )}
            <Text style={styles.googleText}>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.REGISTER)}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Biometric Enable Prompt */}
      <Modal visible={showBiometricPrompt} transparent animationType="fade">
        <View style={styles.biometricOverlay}>
          <View style={styles.biometricCard}>
            <View style={styles.biometricIconCircle}>
              <MaterialIcons name="fingerprint" size={40} color={colors.accent[600]} />
            </View>
            <Text style={styles.biometricTitle}>Enable Biometric Login?</Text>
            <Text style={styles.biometricDesc}>
              Use your fingerprint or face to quickly unlock ArthaSmart next time.
            </Text>
            <TouchableOpacity style={styles.biometricEnableBtn} activeOpacity={0.8} onPress={handleEnableBiometric}>
              <MaterialIcons name="fingerprint" size={20} color={colors.white} />
              <Text style={styles.biometricEnableBtnText}>Enable</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.biometricSkipBtn} onPress={() => setShowBiometricPrompt(false)}>
              <Text style={styles.biometricSkipText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.primary[500],
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.lg,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  forgotText: {
    ...typography.bodySmall,
    color: colors.accent[600],
    fontWeight: '500',
  },
  signInButton: {
    marginTop: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primary[200],
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.primary[400],
    marginHorizontal: spacing.md,
  },
  biometricLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent[200],
    backgroundColor: colors.accent[50],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  biometricLoginText: {
    ...typography.button,
    color: colors.accent[700],
  },
  biometricLoginSub: {
    ...typography.caption,
    color: colors.accent[500],
    marginTop: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    marginBottom: spacing.xl,
  },
  googleText: {
    ...typography.button,
    color: colors.primary[700],
    marginLeft: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  footerText: {
    ...typography.body,
    color: colors.primary[500],
  },
  footerLink: {
    ...typography.body,
    color: colors.accent[600],
    fontWeight: '600',
  },

  // Biometric prompt modal
  biometricOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  biometricCard: {
    width: '85%', backgroundColor: colors.white,
    borderRadius: borderRadius.xl, padding: spacing.lg,
    alignItems: 'center',
  },
  biometricIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.accent[50], alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.md,
  },
  biometricTitle: {
    ...typography.h3, textAlign: 'center', marginBottom: spacing.sm,
  },
  biometricDesc: {
    ...typography.body, color: colors.primary[500],
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg,
  },
  biometricEnableBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accent[600], paddingVertical: 14,
    paddingHorizontal: spacing.xl, borderRadius: borderRadius.md,
    width: '100%', justifyContent: 'center', marginBottom: spacing.sm,
  },
  biometricEnableBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
  biometricSkipBtn: { paddingVertical: spacing.sm },
  biometricSkipText: { ...typography.body, color: colors.primary[400], fontWeight: '500' },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { emailRules, passwordRules } from '../../utils/validators';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import * as biometricService from '../../services/biometric';
import { useGoogleAuthRequest } from '../../services/googleAuth';
import { storage } from '../../utils/storage';

export function LoginScreen({ navigation }) {
  const login = useAuthStore((s) => s.login);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const biometricLogin = useAuthStore((s) => s.biometricLogin);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const resetBiometricCredentials = useAuthStore((s) => s.resetBiometricCredentials);
  const showToast = useAppStore((s) => s.showToast);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState(''); // inline error below password

  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [biometricUserName, setBiometricUserName] = useState('');

  // Google OAuth hook
  const [googleRequest, googleResponse, promptGoogleAsync] = useGoogleAuthRequest();

  // Check if biometric login is available on mount
  useEffect(() => {
    (async () => {
      try {
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

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      if (token) handleGoogleToken(token);
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
      // Navigation happens automatically via RootNavigator
    } catch (error) {
      let message = 'Google sign-in failed. Try again.';
      if (error?.response?.data?.detail) message = error.response.data.detail;
      showToast(message, 'error', 4000);
    } finally {
      setGoogleLoading(false);
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

  const handleBiometricLogin = async () => {
    try {
      const result = await biometricService.authenticate(`Sign in to ArthaSmart`);
      if (!result.success) {
        if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
          showToast('Authentication cancelled', 'info');
        }
        return;
      }
      setLoading(true);
      await biometricLogin();
      // Navigation happens automatically via RootNavigator
    } catch (error) {
      // Token expired or blacklisted — clear biometric state fully
      await resetBiometricCredentials();
      setHasBiometricCredentials(false);
      showToast(
        'Your biometric session expired. Sign in with your password to re-enable it.',
        'info',
        4000,
      );
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

  const onSubmit = async ({ email, password }) => {
    setAuthError('');
    setLoading(true);
    try {
      await login(email, password);
      // Navigation handled automatically by RootNavigator
    } catch (error) {
      const data = error?.response?.data;
      const code = data?.code;
      const status = error?.response?.status;

      if (code === 'WRONG_PASSWORD') {
        // Email is correct but password is wrong — show inline below password field
        setAuthError('Incorrect password.');
      } else if (code === 'EMAIL_NOT_VERIFIED') {
        setAuthError('Please verify your email before signing in.');
      } else if (code === 'EMAIL_NOT_FOUND' || status === 400 || status === 401) {
        // Email not found or other auth failure — use ambiguous toast
        showToast('Invalid email or password.', 'error', 3500);
      } else if (error?.message?.includes('Network Error')) {
        showToast('Cannot reach server. Check your connection.', 'error', 4000);
      } else if (error?.code === 'ECONNABORTED') {
        showToast('Request timed out. Check your connection.', 'error', 4000);
      } else {
        const detail = data?.detail || data?.error || 'Something went wrong. Please try again.';
        showToast(detail, 'error', 4000);
      }
    } finally {
      setLoading(false);
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

          {/* Google Sign In — primary option at top */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && { opacity: 0.6 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.7}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.primary[700]} />
            ) : (
              <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
            )}
            <Text style={styles.googleText}>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / Password Form */}
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
                  onChangeText={(v) => { onChange(v); setAuthError(''); }}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  leftIcon="email"
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
                  onChangeText={(v) => { onChange(v); setAuthError(''); }}
                  error={errors.password?.message || authError}
                  secureTextEntry
                  leftIcon="lock"
                  textContentType="password"
                  autoComplete="off"
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
            />
          </View>

          {/* Biometric Login (shown if user previously enabled biometric) */}
          {hasBiometricCredentials && (
            <TouchableOpacity
              style={styles.biometricLoginBtn}
              onPress={handleBiometricLogin}
              activeOpacity={0.7}
            >
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

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.REGISTER)}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  googleText: {
    ...typography.button,
    color: colors.primary[700],
    marginLeft: spacing.sm,
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
    color: colors.primary[500],
    marginHorizontal: spacing.sm,
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
    textDecorationLine: 'underline',
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
    marginBottom: spacing.lg,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: spacing.md,
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
});

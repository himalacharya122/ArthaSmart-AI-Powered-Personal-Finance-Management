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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { emailRules, passwordRules, nameRules } from '../../utils/validators';
import { checkPasswordStrength, getPasswordChecks } from '../../utils/validators';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useGoogleAuthRequest } from '../../services/googleAuth';

export function RegisterScreen({ navigation }) {
  const register = useAuthStore((s) => s.register);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = useGoogleAuthRequest();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const watchPassword = watch('password');
  const strength = checkPasswordStrength(watchPassword);
  const checks = getPasswordChecks(watchPassword || '');

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const token = googleResponse.authentication?.accessToken;
      if (token) handleGoogleToken(token);
    } else if (googleResponse?.type === 'error') {
      showToast('Google sign-up failed. Try again.', 'error');
      setGoogleLoading(false);
    } else if (googleResponse?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [googleResponse]);

  const handleGoogleToken = async (token) => {
    setGoogleLoading(true);
    try {
      await googleLogin(token);
      // If new user, backend creates account; if existing, logs them in. Either way navigate.
    } catch (error) {
      let message = 'Google sign-up failed. Try again.';
      if (error?.response?.data?.detail) message = error.response.data.detail;
      showToast(message, 'error', 4000);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!googleRequest) {
      showToast('Google Sign-Up not available', 'error');
      return;
    }
    setGoogleLoading(true);
    try {
      await promptGoogleAsync();
    } catch {
      showToast('Google Sign-Up failed', 'error');
      setGoogleLoading(false);
    }
  };

  const onSubmit = async ({ firstName, lastName, email, password }) => {
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
      showToast('Account created! Check your email for a verification code.', 'success', 4000);
      navigation.replace(SCREEN_NAMES.VERIFY_EMAIL, { email });
    } catch (error) {
      let message = 'Something went wrong. Please try again.';

      if (error?.response?.data) {
        const d = error.response.data;
        if (d.email?.[0]) {
          // Map common backend messages to friendly ones
          const raw = d.email[0].toLowerCase();
          if (raw.includes('already exists') || raw.includes('already registered') || raw.includes('in use')) {
            message = 'An account with this email already exists. Try signing in instead.';
          } else {
            message = d.email[0];
          }
        } else if (d.username?.[0]) {
          message = 'An account with this email already exists. Try signing in instead.';
        } else if (d.password?.[0]) {
          message = d.password[0];
        } else if (d.password_confirm?.[0]) {
          message = d.password_confirm[0];
        } else if (d.non_field_errors?.[0]) {
          message = d.non_field_errors[0];
        } else if (typeof d.detail === 'string') {
          if (d.detail.toLowerCase().includes('already exists') || d.detail.toLowerCase().includes('already registered')) {
            message = 'An account with this email already exists. Try signing in instead.';
          } else {
            message = d.detail;
          }
        } else if (Array.isArray(d.detail)) {
          message = d.detail[0];
        } else if (d.error) {
          message = d.error;
        }
      } else if (error?.message?.includes('Network Error')) {
        message = 'Cannot reach server. Check your connection.';
      } else if (error?.code === 'ECONNABORTED') {
        message = 'Request timed out. Check your connection.';
      }

      showToast(message, 'error', 5000);
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
          {/* Back Button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your journey to smarter finances</Text>
          </View>

          {/* Google Sign Up — primary option at top */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && { opacity: 0.6 }]}
            onPress={handleGoogleSignUp}
            disabled={googleLoading}
            activeOpacity={0.7}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.primary[700]} />
            ) : (
              <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
            )}
            <Text style={styles.googleText}>
              {googleLoading ? 'Signing up...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or create with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Controller
                  control={control}
                  name="firstName"
                  rules={nameRules}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="First Name"
                      placeholder="John"
                      value={value}
                      onChangeText={onChange}
                      error={errors.firstName?.message}
                      autoCapitalize="words"
                      leftIcon="person"
                      autoComplete="off"
                      textContentType="givenName"
                    />
                  )}
                />
              </View>
              <View style={styles.nameSpacer} />
              <View style={styles.nameField}>
                <Controller
                  control={control}
                  name="lastName"
                  rules={nameRules}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Last Name"
                      placeholder="Doe"
                      value={value}
                      onChangeText={onChange}
                      error={errors.lastName?.message}
                      autoCapitalize="words"
                      leftIcon="person-outline"
                      autoComplete="off"
                      textContentType="familyName"
                    />
                  )}
                />
              </View>
            </View>

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
                  placeholder="Create a strong password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  secureTextEntry
                  leftIcon="lock"
                  textContentType="newPassword"
                  autoComplete="off"
                />
              )}
            />

            {/* Password Strength Indicator */}
            {watchPassword?.length > 0 && (
              <View style={styles.strengthSection}>
                <View style={styles.strengthBar}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: i < strength.score ? strength.color : colors.primary[200] },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
                <View style={styles.checkList}>
                  {checks.map((check) => (
                    <View key={check.label} style={styles.checkItem}>
                      <MaterialIcons
                        name={check.met ? 'check-circle' : 'radio-button-unchecked'}
                        size={16}
                        color={check.met ? colors.accent[500] : colors.primary[300]}
                      />
                      <Text style={[styles.checkText, check.met && styles.checkTextMet]}>
                        {check.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: 'Please confirm your password',
                validate: (value) => value === watchPassword || 'Passwords do not match',
              }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                  secureTextEntry
                  leftIcon="lock-outline"
                  textContentType="newPassword"
                  autoComplete="off"
                />
              )}
            />

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              variant="accent"
              size="lg"
              fullWidth
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.LOGIN)}>
              <Text style={styles.footerLink}>Sign In</Text>
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
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  header: { marginBottom: spacing.lg },
  title: { ...typography.h1, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.primary[500] },
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
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.primary[200] },
  dividerText: {
    ...typography.bodySmall,
    color: colors.primary[500],
    marginHorizontal: spacing.sm,
  },
  form: { marginBottom: spacing.lg },
  nameRow: { flexDirection: 'row' },
  nameField: { flex: 1 },
  nameSpacer: { width: spacing.sm },
  strengthSection: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  strengthBar: { flexDirection: 'row', gap: 4, marginBottom: spacing.xs },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { ...typography.caption, fontWeight: '500', marginBottom: spacing.xs },
  checkList: { gap: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkText: { ...typography.caption, color: colors.primary[400] },
  checkTextMet: { color: colors.accent[600] },
  submitButton: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  footerText: { ...typography.body, color: colors.primary[500] },
  footerLink: { ...typography.body, color: colors.accent[600], fontWeight: '600' },
});

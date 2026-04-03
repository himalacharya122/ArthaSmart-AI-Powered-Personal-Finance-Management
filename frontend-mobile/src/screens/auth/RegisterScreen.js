import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { emailRules, passwordRules, nameRules } from '../../utils/validators';
import { checkPasswordStrength, getPasswordChecks } from '../../utils/validators';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export function RegisterScreen({ navigation }) {
  const register = useAuthStore((s) => s.register);
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);

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
        // Check field-specific errors first
        if (d.email?.[0]) message = d.email[0];
        else if (d.username?.[0]) message = d.username[0];
        else if (d.password?.[0]) message = d.password[0];
        else if (d.password_confirm?.[0]) message = d.password_confirm[0];
        else if (d.non_field_errors?.[0]) message = d.non_field_errors[0];
        else if (typeof d.detail === 'string') message = d.detail;
        else if (Array.isArray(d.detail)) message = d.detail[0];
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

  const handleGoogleSignUp = () => {
    showToast('Google Sign-Up coming soon!', 'info');
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
                  placeholder="Create a strong password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  secureTextEntry
                  leftIcon="lock"
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
                        {
                          backgroundColor:
                            i < strength.score ? strength.color : colors.primary[200],
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>

                {/* Password Checklist */}
                <View style={styles.checkList}>
                  {checks.map((check) => (
                    <View key={check.label} style={styles.checkItem}>
                      <MaterialIcons
                        name={check.met ? 'check-circle' : 'radio-button-unchecked'}
                        size={16}
                        color={check.met ? colors.accent[500] : colors.primary[300]}
                      />
                      <Text
                        style={[
                          styles.checkText,
                          check.met && styles.checkTextMet,
                        ]}
                      >
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
                validate: (value) =>
                  value === watchPassword || 'Passwords do not match',
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

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign Up */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignUp}>
            <MaterialIcons name="g-mobiledata" size={24} color={colors.primary[700]} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>

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
  flex: {
    flex: 1,
  },
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
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.primary[500],
  },
  form: {
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
  },
  nameField: {
    flex: 1,
  },
  nameSpacer: {
    width: spacing.sm,
  },
  strengthSection: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    ...typography.caption,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  checkList: {
    gap: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    ...typography.caption,
    color: colors.primary[400],
  },
  checkTextMet: {
    color: colors.accent[600],
  },
  submitButton: {
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
});

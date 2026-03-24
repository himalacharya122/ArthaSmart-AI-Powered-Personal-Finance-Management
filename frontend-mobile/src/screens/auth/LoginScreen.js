import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
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

export function LoginScreen({ navigation }) {
  const login = useAuthStore((s) => s.login);
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      await login(email, password);
      // Navigation happens automatically via RootNavigator (isAuthenticated → MainTabs)
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.non_field_errors?.[0] ||
        error?.response?.data?.error ||
        'Invalid email or password. Please try again.';
      showToast(message, 'error', 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    showToast('Google Sign-In coming soon!', 'info');
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

          {/* Google Sign In */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <MaterialIcons name="g-mobiledata" size={24} color={colors.primary[700]} />
            <Text style={styles.googleText}>Continue with Google</Text>
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

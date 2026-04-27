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
import { emailRules } from '../../utils/validators';
import { useAppStore } from '../../store/appStore';
import * as authService from '../../services/auth';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export function ForgotPasswordScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 500) {
        showToast('Could not send email. Please try again later.', 'error', 4000);
      } else if (error?.message?.includes('Network Error')) {
        showToast('Cannot reach server. Check your connection.', 'error', 4000);
      } else {
        // For any other response (including email-not-found), show the sent state
        // Backend already uses ambiguous messaging — mirror that on frontend
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    const email = getValues('email');
    if (email) {
      onSubmit({ email });
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

          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={sent ? 'mark-email-read' : 'lock-reset'}
              size={48}
              color={sent ? colors.accent[600] : colors.primary[600]}
            />
          </View>

          {sent ? (
            /* Success State */
            <View style={styles.sentContent}>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                If an account exists for{' '}
                <Text style={styles.emailHighlight}>{getValues('email')}</Text>
                {'\n'}you'll receive a reset link shortly.
              </Text>

              <View style={styles.instructions}>
                <View style={styles.instructionItem}>
                  <MaterialIcons name="email" size={20} color={colors.accent[500]} />
                  <Text style={styles.instructionText}>Open the email we sent you</Text>
                </View>
                <View style={styles.instructionItem}>
                  <MaterialIcons name="link" size={20} color={colors.accent[500]} />
                  <Text style={styles.instructionText}>Click the password reset link</Text>
                </View>
                <View style={styles.instructionItem}>
                  <MaterialIcons name="lock" size={20} color={colors.accent[500]} />
                  <Text style={styles.instructionText}>Create your new password</Text>
                </View>
              </View>

              <Button
                title="Resend Email"
                onPress={handleResend}
                variant="outline"
                size="lg"
                fullWidth
                loading={loading}
                style={styles.resendButton}
              />

              <Button
                title="Back to Sign In"
                onPress={() => navigation.goBack()}
                variant="accent"
                size="lg"
                fullWidth
              />
            </View>
          ) : (
            /* Form State */
            <>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                No worries! Enter your email address and we'll send you a link to reset your
                password.
              </Text>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  rules={emailRules}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Email Address"
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

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit(onSubmit)}
                  variant="accent"
                  size="lg"
                  fullWidth
                  loading={loading}
                  style={styles.submitButton}
                />
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Remember your password? </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.primary[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emailHighlight: {
    color: colors.accent[600],
    fontWeight: '600',
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  sentContent: {
    flex: 1,
  },
  instructions: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  instructionText: {
    ...typography.body,
    color: colors.primary[600],
  },
  resendButton: {
    marginBottom: spacing.sm,
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

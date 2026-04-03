/**
 * VerifyEmailScreen: User enters the 6-digit verification code sent via email.
 *
 * After successful verification, navigates to Login screen.
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import { verifyEmail, resendVerification } from '../../services/auth';

const CODE_LENGTH = 6;

export function VerifyEmailScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const showToast = useAppStore((s) => s.showToast);

  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (text, index) => {
    const newCode = [...code];
    // Handle paste (multiple characters)
    if (text.length > 1) {
      const chars = text.replace(/\D/g, '').split('').slice(0, CODE_LENGTH);
      chars.forEach((char, i) => {
        if (i + index < CODE_LENGTH) newCode[i + index] = char;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newCode[index] = text.replace(/\D/g, '');
      setCode(newCode);
      if (text && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const fullCode = code.join('');

  const handleVerify = async () => {
    if (fullCode.length < CODE_LENGTH) {
      showToast('Please enter the full 6-digit code', 'error');
      return;
    }
    setVerifying(true);
    try {
      await verifyEmail(email, fullCode);
      showToast('Email verified! You can now sign in.', 'success', 3000);
      navigation.replace(SCREEN_NAMES.LOGIN);
    } catch (error) {
      let message = 'Verification failed. Please try again.';
      if (error?.response?.data?.detail) {
        message = error.response.data.detail;
      }
      showToast(message, 'error', 4000);
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await resendVerification(email);
      showToast('New verification code sent!', 'success');
      setCooldown(60);
    } catch (error) {
      let message = 'Failed to resend code. Please try again.';
      if (error?.response?.data?.detail) {
        message = error.response.data.detail;
      }
      showToast(message, 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons name="mark-email-read" size={48} color={colors.accent[600]} />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* Code inputs */}
          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null,
                ]}
                value={digit}
                onChangeText={(text) => handleChange(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={i === 0 ? CODE_LENGTH : 1}
                textContentType="oneTimeCode"
                autoFocus={i === 0}
              />
            ))}
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, fullCode.length < CODE_LENGTH && styles.verifyBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleVerify}
            disabled={fullCode.length < CODE_LENGTH || verifying}
          >
            {verifying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.verifyBtnText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || resending}>
              <Text style={[styles.resendLink, cooldown > 0 && { color: colors.primary[300] }]}>
                {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.replace(SCREEN_NAMES.LOGIN)}
          >
            <Text style={styles.loginLinkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: {
    flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  backButton: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50], alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.accent[50], alignItems: 'center',
    justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1, textAlign: 'center', marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body, color: colors.primary[500], textAlign: 'center',
    lineHeight: 24, marginBottom: spacing.xl,
  },
  emailText: {
    fontWeight: '600', color: colors.primary[800],
  },
  codeRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 10, marginBottom: spacing.xl,
  },
  codeInput: {
    width: 48, height: 56, borderRadius: borderRadius.md,
    borderWidth: 2, borderColor: colors.primary[200],
    backgroundColor: colors.primary[50], textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: colors.primary[800],
  },
  codeInputFilled: {
    borderColor: colors.accent[400], backgroundColor: colors.accent[50],
  },
  verifyBtn: {
    backgroundColor: colors.accent[600], paddingVertical: 16,
    borderRadius: borderRadius.md, alignItems: 'center',
    marginBottom: spacing.lg,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
  resendRow: {
    flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.lg,
  },
  resendText: { ...typography.body, color: colors.primary[500] },
  resendLink: {
    ...typography.body, color: colors.accent[600], fontWeight: '600',
  },
  loginLink: { alignItems: 'center' },
  loginLinkText: {
    ...typography.body, color: colors.primary[500], fontWeight: '500',
  },
});

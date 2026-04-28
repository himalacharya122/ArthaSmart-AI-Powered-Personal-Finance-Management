/**
 * ScanProcessingScreen, OCR processing with progress animation.
 *
 * Shows the captured/selected receipt image while OCR runs.
 * On success --> navigates to ReceiptReviewScreen with extracted data.
 * On failure --> shows retry option.
 */
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { SCREEN_NAMES } from '../../utils/constants';
import { extractText, parseReceiptText } from '../../services/ocr';
import { useAppStore } from '../../store/appStore';

const STEPS = [
  { icon: 'cloud-upload', label: 'Uploading image...' },
  { icon: 'text-fields', label: 'Extracting text...' },
  { icon: 'auto-fix-high', label: 'Parsing receipt data...' },
  { icon: 'check-circle', label: 'Done!' },
];

export function ScanProcessingScreen({ navigation, route }) {
  const { imageUri, source } = route.params;
  const showToast = useAppStore((s) => s.showToast);

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  // Animated scan line
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Scanning line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Pulse animation for step icons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [scanLineAnim, pulseAnim]);

  // Run OCR
  useEffect(() => {
    let cancelled = false;

    async function processReceipt() {
      try {
        setCurrentStep(0);
        setError(null);
        setProcessing(true);

        // Step 1: Uploading (brief delay for UX)
        await delay(500);
        if (cancelled) return;
        setCurrentStep(1);

        // Step 2: Extract text via OCR
        const ocrResult = await extractText(imageUri);
        if (cancelled) return;
        setCurrentStep(2);

        // Step 3: Parse receipt data
        await delay(300);
        const receiptData = parseReceiptText(ocrResult.rawText);
        if (cancelled) return;
        setCurrentStep(3);

        // Brief pause to show "Done!"
        await delay(600);
        if (cancelled) return;

        // Navigate to review
        navigation.replace(SCREEN_NAMES.SCAN_REVIEW, {
          receiptData: {
            ...receiptData,
            ocrConfidence: ocrResult.confidence,
          },
          imageUri,
          source,
        });
      } catch (err) {
        if (cancelled) return;
        console.warn('OCR Error:', err);
        setError(err.message || 'Failed to process receipt');
        setProcessing(false);
      }
    }

    processReceipt();
    return () => { cancelled = true; };
  }, [imageUri, navigation, source]);

  const handleRetry = () => {
    setError(null);
    setProcessing(true);
    setCurrentStep(0);
    // Re-trigger by navigating to self
    navigation.replace(SCREEN_NAMES.SCAN_PROCESSING, { imageUri, source });
  };

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[800]} />
        </TouchableOpacity>
        <Text style={typography.h3}>Processing Receipt</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Image preview with scan overlay */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        {processing && (
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineTranslateY }] },
            ]}
          />
        )}
        {processing && <View style={styles.scanOverlay} />}
      </View>

      {/* Progress steps */}
      <View style={styles.stepsContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <MaterialIcons name="error-outline" size={40} color={colors.danger[500]} />
            </View>
            <Text style={styles.errorTitle}>Processing Failed</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={handleRetry}>
                <MaterialIcons name="refresh" size={20} color={colors.white} />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <View key={step.label} style={styles.stepRow}>
                <Animated.View
                  style={[
                    styles.stepIcon,
                    isDone && styles.stepIconDone,
                    isActive && styles.stepIconActive,
                    isActive && { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <MaterialIcons
                    name={isDone ? 'check' : step.icon}
                    size={18}
                    color={isDone ? colors.white : isActive ? colors.primary[800] : colors.primary[300]}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isActive && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </SafeAreaView>
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },

  // Image preview
  imageContainer: {
    marginHorizontal: spacing.lg, height: 300, borderRadius: borderRadius.lg,
    overflow: 'hidden', backgroundColor: colors.primary[100], ...shadow.md,
  },
  image: { width: '100%', height: '100%' },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: colors.accent[500], opacity: 0.8,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 2, borderColor: colors.accent[400], borderRadius: borderRadius.lg,
  },

  // Steps
  stepsContainer: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  stepIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  stepIconDone: { backgroundColor: colors.accent[500] },
  stepIconActive: { backgroundColor: colors.accent[50], borderWidth: 2, borderColor: colors.accent[400] },
  stepLabel: { ...typography.body, color: colors.primary[300] },
  stepLabelDone: { color: colors.accent[700] },
  stepLabelActive: { color: colors.primary[800], fontWeight: '600' },

  // Error
  errorContainer: { alignItems: 'center', paddingTop: spacing.md },
  errorIcon: { marginBottom: spacing.md },
  errorTitle: { ...typography.h3, color: colors.danger[600], marginBottom: spacing.xs },
  errorMessage: { ...typography.bodySmall, color: colors.primary[500], textAlign: 'center', marginBottom: spacing.lg },
  errorActions: { flexDirection: 'row', gap: spacing.md },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary[800], paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg, borderRadius: borderRadius.md,
  },
  retryBtnText: { ...typography.button, color: colors.white },
  cancelBtn: {
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary[300],
  },
  cancelBtnText: { ...typography.button, color: colors.primary[600] },
});

import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { SCREEN_NAMES } from '../../utils/constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'account-balance-wallet',
    title: 'Your finances, always in view',
    description:
      'Track income, expenses, and savings at a glance. Set budgets and see exactly where your money goes each month.',
    color: colors.accent[600],
  },
  {
    id: '2',
    icon: 'smart-toy',
    title: 'An AI that thinks ahead',
    description:
      'ArthaSmart AI learns your habits, warns you about overspending, and helps you log expenses with just a message or your voice.',
    color: colors.primary[800],
  },
  {
    id: '3',
    icon: 'receipt-long',
    title: 'Scan a receipt, done in seconds',
    description:
      'Point your camera at any receipt. AI extracts the merchant, items, and total automatically — no manual entry needed.',
    color: colors.accent[700],
  },
];

export function OnboardingScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  function handleSkip() {
    completeOnboarding();
    navigation.replace(SCREEN_NAMES.LOGIN);
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleSkip();
    }
  }

  function onViewableItemsChanged({ viewableItems }) {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewRef = useRef(onViewableItemsChanged).current;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewRef}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
              <MaterialIcons name={item.icon} size={64} color={item.color} />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDescription}>{item.description}</Text>
          </View>
        )}
      />

      {/* Dots + Button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <Button
          title={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          onPress={handleNext}
          variant="primary"
          size="lg"
          fullWidth
        />

        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => {
            completeOnboarding();
            navigation.replace(SCREEN_NAMES.LOGIN);
          }}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.primary[400],
    fontWeight: '500',
  },
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  slideTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    ...typography.body,
    color: colors.primary[500],
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[200],
  },
  dotActive: {
    backgroundColor: colors.primary[800],
    width: 24,
  },
  signInLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  signInText: {
    ...typography.bodySmall,
    color: colors.primary[400],
  },
  signInBold: {
    color: colors.accent[600],
    fontWeight: '600',
  },
});

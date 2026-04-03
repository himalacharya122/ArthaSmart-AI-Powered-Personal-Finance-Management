/**
 * OnboardingScreen, 3-slide carousel with mock UI previews.
 *
 * Slide 1: Dashboard preview --> "Your finances, always in view"
 * Slide 2: AI Chat preview --> "An AI that thinks ahead"
 * Slide 3: Receipt scanner preview --> "Scan a receipt, done in seconds"
 *
 * Per wireframes: each slide shows a mock UI card above the title/description.
 */
import { useState, useRef } from 'react';
import {
  View, Text, FlatList, Dimensions, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { SCREEN_NAMES } from '../../utils/constants';

const { width } = Dimensions.get('window');

// Mock UI Components for each slide

function DashboardPreview() {
  return (
    <View style={mockStyles.card}>
      <View style={mockStyles.labelRow}>
        <Text style={mockStyles.labelSmall}>REMAINING</Text>
      </View>
      <View style={[mockStyles.darkCard, { marginBottom: 8 }]}>
        <Text style={mockStyles.labelSmall2}>REMAINING</Text>
        <Text style={mockStyles.bigNumber}>NPR 6,550</Text>
      </View>
      <View style={mockStyles.statsRow}>
        <View style={mockStyles.statBox}>
          <Text style={mockStyles.statLabel}>SPENT</Text>
          <Text style={mockStyles.statValue}>18,450</Text>
        </View>
        <View style={mockStyles.statBox}>
          <Text style={mockStyles.statLabel}>INCOME</Text>
          <Text style={mockStyles.statValue}>25,000</Text>
        </View>
        <View style={mockStyles.statBox}>
          <Text style={mockStyles.statLabel}>SAVED</Text>
          <Text style={mockStyles.statValue}>26%</Text>
        </View>
      </View>
      <View style={mockStyles.chartArea}>
        <Text style={mockStyles.chartLabel}>MONTHLY OVERVIEW</Text>
        <View style={mockStyles.barRow}>
          {[30, 45, 35, 50, 40, 70, 65].map((h, i) => (
            <View key={i} style={[mockStyles.bar, { height: h * 0.6, backgroundColor: i >= 5 ? colors.primary[800] : colors.primary[300] }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

function ChatPreview() {
  return (
    <View style={mockStyles.card}>
      <View style={mockStyles.chatBubbleLeft}>
        <Text style={mockStyles.chatText}>
          Hey! Your food budget is at 80%.{'\n'}Want me to suggest ways to cut back?
        </Text>
      </View>
      <View style={mockStyles.chipRow}>
        <View style={mockStyles.chip}><Text style={mockStyles.chipText}>Show breakdown</Text></View>
        <View style={mockStyles.chip}><Text style={mockStyles.chipText}>Suggest cuts</Text></View>
      </View>
      <View style={mockStyles.chatBubbleRight}>
        <Text style={mockStyles.chatTextRight}>I spent 2500 on IoT devices today</Text>
      </View>
      <View style={mockStyles.chatBubbleLeft}>
        <Text style={mockStyles.chatText}>
          Done! Logged under <Text style={{ fontWeight: '700' }}>Electronics</Text>.{'\n'}
          Heads up — misc budget is now at 92%.
        </Text>
      </View>
    </View>
  );
}

function ScannerPreview() {
  return (
    <View style={mockStyles.scanCard}>
      <View style={mockStyles.scanFrame}>
        <View style={mockStyles.scanCornerTL} />
        <View style={mockStyles.scanCornerTR} />
        <View style={mockStyles.scanCornerBL} />
        <View style={mockStyles.scanCornerBR} />
        <View style={mockStyles.scanLines}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[mockStyles.scanLine, { width: `${60 + Math.random() * 30}%` }]} />
          ))}
          <View style={[mockStyles.scanLine, { width: '50%', height: 4, backgroundColor: colors.primary[700] }]} />
        </View>
      </View>
    </View>
  );
}

const SLIDES = [
  {
    id: '1',
    Preview: DashboardPreview,
    title: 'Your finances,\nalways in view',
    description: 'See exactly where your money goes, in real time. Budgets, income and savings — all in one clean dashboard.',
  },
  {
    id: '2',
    Preview: ChatPreview,
    title: 'An AI that\nthinks ahead',
    description: 'Log expenses by chatting naturally. Get proactive alerts, anomaly detection and weekly spending summaries — automatically.',
  },
  {
    id: '3',
    Preview: ScannerPreview,
    title: 'Scan a receipt,\ndone in seconds',
    description: 'Point your camera at any receipt. AI reads the merchant, items and total — then logs the expense for you automatically.',
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
        renderItem={({ item }) => {
          const Preview = item.Preview;
          return (
            <View style={styles.slide}>
              <View style={styles.previewContainer}>
                <Preview />
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideDescription}>{item.description}</Text>
            </View>
          );
        }}
      />

      {/* Dots + Button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <Button
          title={activeIndex === SLIDES.length - 1 ? 'Get started' : 'Continue'}
          onPress={handleNext}
          variant="primary"
          size="lg"
          fullWidth
        />

        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => { completeOnboarding(); navigation.replace(SCREEN_NAMES.LOGIN); }}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Mock UI Styles
const mockStyles = StyleSheet.create({
  card: {
    width: width - 80,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadow.md,
  },
  labelRow: { marginBottom: 4 },
  labelSmall: { fontSize: 9, fontWeight: '600', color: colors.primary[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  labelSmall2: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  darkCard: {
    backgroundColor: colors.primary[800], borderRadius: borderRadius.md,
    padding: spacing.sm + 2, paddingHorizontal: spacing.md,
  },
  bigNumber: { fontSize: 22, fontWeight: '700', color: colors.white },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statBox: {
    flex: 1, backgroundColor: colors.primary[50], borderRadius: borderRadius.sm,
    padding: spacing.sm, alignItems: 'center',
  },
  statLabel: { fontSize: 8, fontWeight: '600', color: colors.primary[400], textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.primary[800], marginTop: 2 },
  chartArea: {
    backgroundColor: colors.primary[50], borderRadius: borderRadius.sm, padding: spacing.sm,
  },
  chartLabel: { fontSize: 8, fontWeight: '600', color: colors.primary[400], textTransform: 'uppercase', marginBottom: 6 },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 50 },
  bar: { flex: 1, borderRadius: 2, minHeight: 8 },

  // Chat mock
  chatBubbleLeft: {
    alignSelf: 'flex-start', backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm, maxWidth: '85%',
  },
  chatText: { fontSize: 12, color: colors.primary[700], lineHeight: 17 },
  chatBubbleRight: {
    alignSelf: 'flex-end', backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm, maxWidth: '75%',
  },
  chatTextRight: { fontSize: 12, color: colors.white, lineHeight: 17 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1, borderColor: colors.primary[300], borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2, paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '500', color: colors.primary[700] },

  // Scanner mock
  scanCard: {
    width: width - 80, height: 200, backgroundColor: colors.primary[100],
    borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', justifyContent: 'center',
  },
  scanFrame: {
    width: '80%', height: '90%', position: 'relative', justifyContent: 'center', alignItems: 'center',
  },
  scanCornerTL: { position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.primary[500] },
  scanCornerTR: { position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.primary[500] },
  scanCornerBL: { position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: colors.primary[500] },
  scanCornerBR: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.primary[500] },
  scanLines: { width: '70%', gap: 8 },
  scanLine: { height: 2, backgroundColor: colors.primary[300], borderRadius: 1 },
});

// Main Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  skipButton: { position: 'absolute', top: 60, right: spacing.lg, zIndex: 10 },
  skipText: { ...typography.body, color: colors.primary[400], fontWeight: '500' },
  slide: {
    width, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 80,
  },
  previewContainer: { marginBottom: spacing.xl },
  slideTitle: {
    ...typography.h1, textAlign: 'left', alignSelf: 'flex-start',
    marginBottom: spacing.sm, lineHeight: 36,
  },
  slideDescription: {
    ...typography.body, color: colors.primary[500], textAlign: 'left',
    alignSelf: 'flex-start', lineHeight: 24,
  },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  dots: {
    flexDirection: 'row', justifyContent: 'center',
    marginBottom: spacing.lg, gap: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[200] },
  dotActive: { backgroundColor: colors.primary[800], width: 24 },
  signInLink: { marginTop: spacing.md, alignItems: 'center' },
  signInText: { ...typography.bodySmall, color: colors.primary[400] },
  signInBold: { color: colors.primary[800], fontWeight: '600' },
});

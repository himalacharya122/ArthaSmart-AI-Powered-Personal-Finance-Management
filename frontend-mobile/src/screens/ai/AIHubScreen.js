/**
 * AI Hub - Main screen for Chat tab.
 * Shows AI Insights, Quick Actions, Recent AI Activity.
 */
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { formatRelativeDate } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

function AISparkle({ size = 20 }) {
  const long = size * 0.9;
  const short = size * 0.22;
  const br = short / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={['#34D399', '#0EA5E9']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', width: short, height: long, borderRadius: br }}
      />
      <LinearGradient
        colors={['#0EA5E9', '#34D399']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', width: long, height: short, borderRadius: br }}
      />
    </View>
  );
}

const SEVERITY_DOT = {
  high: colors.danger[500],
  medium: colors.warning[400],
  low: colors.primary[400],
};

const QUICK_ACTIONS = [
  { key: 'chat',      icon: 'chat-bubble-outline', label: 'Chat with AI',    screen: null,                          bg: colors.primary[900], color: colors.white },
  { key: 'insights',  icon: 'bar-chart',           label: 'Spending Report', screen: SCREEN_NAMES.INSIGHTS,         bg: colors.primary[100], color: colors.primary[700] },
  { key: 'anomalies', icon: 'warning-amber',       label: 'View Anomalies',  screen: SCREEN_NAMES.ANOMALIES,        bg: colors.warning[100], color: colors.warning[600] },
  { key: 'report',    icon: 'assessment',          label: 'Monthly Report',  screen: SCREEN_NAMES.FINANCIAL_REPORT, bg: colors.accent[100],  color: colors.accent[700] },
];

export function AIHubScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [conversations, setConversations] = useState([]);

  // Collapsing header animation
  const scrollY = useRef(new Animated.Value(0)).current;

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const smallTitleOpacity = scrollY.interpolate({
    inputRange: [30, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const separatorOpacity = scrollY.interpolate({
    inputRange: [50, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [insRes, convRes] = await Promise.all([
        chatService.getInsights({ is_dismissed: false, ordering: '-generated_at', page_size: 5 }).catch(() => ({ results: [] })),
        chatService.getConversations({ ordering: '-updated_at', page_size: 5 }).catch(() => ({ results: [] })),
      ]);
      setInsights(insRes.results || []);
      setConversations(convRes.results || []);
    } catch {
      if (!isRefresh) showToast('Failed to load AI Hub', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const startNewChat = () => {
    navigation.navigate(SCREEN_NAMES.AI_CHAT, {});
  };

  const handleQuickAction = (action) => {
    if (action.key === 'chat') {
      startNewChat();
    } else {
      navigation.navigate(action.screen);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <Animated.Text style={[styles.navTitle, { opacity: 0 }]}>
            AI Hub
          </Animated.Text>
        </View>
        <LoadingSpinner message="Loading AI Hub..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Compact sticky bar — title fades in as you scroll */}
      <View style={styles.navBar}>
        <Animated.Text style={[styles.navTitle, { opacity: smallTitleOpacity }]}>
          AI Hub
        </Animated.Text>
        <Animated.View style={[styles.navSeparator, { opacity: separatorOpacity }]} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[colors.accent[600]]}
          />
        }
      >
        {/* Large title — fades out as you scroll */}
        <Animated.Text style={[styles.largeTitle, { opacity: largeTitleOpacity }]}>
          AI Hub
        </Animated.Text>

        {/* AI Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Insights</Text>
              <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.INSIGHTS)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {insights.slice(0, 4).map((insight) => (
              <TouchableOpacity
                key={insight.id}
                style={styles.insightCard}
                activeOpacity={0.7}
                onPress={() => {
                  chatService.markInsightRead(insight.id).catch(() => {});
                  navigation.navigate(SCREEN_NAMES.INSIGHTS);
                }}
              >
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle} numberOfLines={1}>
                    <Text style={{ fontWeight: '700' }}>{insight.title}</Text>
                  </Text>
                  <Text style={styles.insightDesc} numberOfLines={2}>{insight.description}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.primary[500]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={[styles.sectionHeader, styles.sectionHeaderPadded]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[styles.quickCard, { backgroundColor: action.bg }]}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.75}
            >
              <MaterialIcons name={action.icon} size={24} color={action.color} />
              <Text style={[styles.quickCardLabel, { color: action.color }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent AI Activity */}
        {conversations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent AI Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.CHAT_HISTORY)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityCard}>
              {conversations.slice(0, 4).map((conv, idx, arr) => (
                <TouchableOpacity
                  key={conv.id}
                  style={[
                    styles.activityItem,
                    idx < arr.length - 1 && styles.activityItemDivider,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: conv.id })}
                >
                  <View style={styles.activityIconBg}>
                    <MaterialIcons name="chat-bubble-outline" size={17} color={colors.primary[500]} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {conv.title ? `"${conv.title}"` : 'New conversation'}
                    </Text>
                    <Text style={styles.activityMeta}>
                      Chat · {conv.last_message_at ? formatRelativeDate(conv.last_message_at) : formatRelativeDate(conv.created_at)}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.primary[500]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Ask AI Shortcut */}
        <TouchableOpacity style={styles.askAiBar} onPress={startNewChat} activeOpacity={0.75}>
          <View style={styles.askAiIconBg}>
            <AISparkle size={18} />
          </View>
          <Text style={styles.askAiText}>Ask AI anything about your finances</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.primary[500]} />
        </TouchableOpacity>

      </Animated.ScrollView>

      {/* Floating chat button */}
      <TouchableOpacity style={styles.fab} onPress={startNewChat} activeOpacity={0.85}>
        <AISparkle size={26} />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  // Collapsing header
  navBar: {
    height: 46,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[900],
    letterSpacing: -0.3,
  },
  navSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary[200],
  },
  largeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[900],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    letterSpacing: -0.5,
  },

  scrollContent: { paddingBottom: spacing.xxl },

  // Sections
  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, fontSize: 17, color: colors.primary[900] },
  seeAll: { ...typography.bodySmall, color: colors.primary[800], fontWeight: '500', textDecorationLine: 'underline' },
  sectionHeaderPadded: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Insight cards
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  insightContent: { flex: 1, marginRight: spacing.sm },
  insightTitle: { ...typography.body, fontSize: 14, color: colors.primary[800] },
  insightDesc: { ...typography.caption, color: colors.primary[500], marginTop: 2, lineHeight: 17 },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadow.sm,
  },
  quickCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 8,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary[900],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },

  // Recent activity
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    overflow: 'hidden',
    ...shadow.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  activityItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  activityIconBg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  activityInfo: { flex: 1, marginRight: spacing.sm },
  activityTitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary[800],
    fontWeight: '500',
  },
  activityMeta: { ...typography.caption, color: colors.primary[400], marginTop: 2 },

  // Ask AI bar
  askAiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing.sm,
    ...shadow.sm,
  },
  askAiIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  askAiText: {
    ...typography.body,
    color: colors.primary[700],
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

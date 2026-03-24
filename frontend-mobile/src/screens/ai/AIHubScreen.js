/**
 * AI Hub — Main screen for Chat tab.
 * Shows AI Insights, Quick Actions, Recent AI Activity.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { formatRelativeDate } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const SEVERITY_COLORS = {
  high: colors.danger[500],
  medium: colors.warning[500],
  low: colors.primary[500],
};

const SEVERITY_DOT = {
  high: colors.danger[500],
  medium: colors.warning[400],
  low: colors.primary[400],
};

export function AIHubScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [conversations, setConversations] = useState([]);

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

  const startNewChat = async () => {
    try {
      const conv = await chatService.createConversation();
      navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: conv.id });
    } catch {
      showToast('Failed to start chat', 'error');
    }
  };

  const today = format(new Date(), 'EEEE, d MMMM').toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading AI Hub..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent[600]]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.dateLabel}>{today}</Text>
        <Text style={styles.title}>AI Insights</Text>

        {/* AI Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI Insights</Text>
              <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.INSIGHTS)}>
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
                <View style={[styles.insightDot, { backgroundColor: SEVERITY_DOT[insight.severity] || colors.primary[400] }]} />
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle} numberOfLines={1}>
                    <Text style={{ fontWeight: '700' }}>{insight.title}</Text>
                  </Text>
                  <Text style={styles.insightDesc} numberOfLines={2}>{insight.description}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={[styles.quickCard, styles.quickCardActive]} onPress={startNewChat}>
            <MaterialIcons name="chat-bubble-outline" size={28} color={colors.primary[800]} />
            <Text style={styles.quickCardLabel}>Chat with AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate(SCREEN_NAMES.INSIGHTS)}>
            <MaterialIcons name="bar-chart" size={28} color={colors.primary[600]} />
            <Text style={styles.quickCardLabel}>Spending report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate(SCREEN_NAMES.ANOMALIES)}>
            <MaterialIcons name="warning-amber" size={28} color={colors.primary[600]} />
            <Text style={styles.quickCardLabel}>View anomalies</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate(SCREEN_NAMES.FINANCIAL_REPORT)}>
            <MaterialIcons name="assessment" size={28} color={colors.primary[600]} />
            <Text style={styles.quickCardLabel}>Monthly report</Text>
          </TouchableOpacity>
        </View>

        {/* Recent AI Activity */}
        {conversations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent AI Activity</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {conversations.slice(0, 4).map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={styles.activityItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: conv.id })}
              >
                <View style={styles.activityIcon}>
                  <MaterialIcons name="chat-bubble-outline" size={18} color={colors.primary[500]} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    "{conv.title || 'New conversation'}"
                  </Text>
                  <Text style={styles.activityMeta}>
                    Chat · {conv.last_message_at ? formatRelativeDate(conv.last_message_at) : formatRelativeDate(conv.created_at)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Ask AI Shortcut */}
        <TouchableOpacity style={styles.askAiBar} onPress={startNewChat}>
          <MaterialIcons name="emoji-objects" size={20} color={colors.primary[600]} />
          <Text style={styles.askAiText}>Ask AI about this</Text>
          <MaterialIcons name="arrow-forward" size={20} color={colors.primary[600]} />
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  dateLabel: { ...typography.caption, color: colors.primary[400], fontWeight: '600', letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { ...typography.h1, fontSize: 26, marginBottom: spacing.lg },

  // Section
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { ...typography.h3, fontSize: 16 },
  seeAll: { ...typography.bodySmall, color: colors.primary[500], fontWeight: '500' },
  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm },

  // Insight cards
  insightCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[100] },
  insightDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  insightContent: { flex: 1, marginRight: spacing.sm },
  insightTitle: { ...typography.body, fontSize: 14, color: colors.primary[800] },
  insightDesc: { ...typography.caption, color: colors.primary[500], marginTop: 2 },

  // Quick actions grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  quickCard: { width: '48%', backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.primary[200], alignItems: 'center', gap: spacing.sm },
  quickCardActive: { backgroundColor: colors.primary[50], borderColor: colors.primary[300] },
  quickCardLabel: { ...typography.bodySmall, color: colors.primary[700], fontWeight: '500', textAlign: 'center' },

  // Recent activity
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[100] },
  activityIcon: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  activityInfo: { flex: 1, marginRight: spacing.sm },
  activityTitle: { ...typography.body, fontSize: 14, color: colors.primary[800], fontWeight: '500' },
  activityMeta: { ...typography.caption, color: colors.primary[400], marginTop: 2 },

  // Ask AI bar
  askAiBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], gap: spacing.sm },
  askAiText: { ...typography.body, color: colors.primary[600], flex: 1 },
});

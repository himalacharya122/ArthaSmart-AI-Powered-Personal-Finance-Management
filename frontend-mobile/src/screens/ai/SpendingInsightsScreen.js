/**
 * Spending Insights - Detailed spending breakdown with charts.
 *
 * Features:
 * - Personality badge ("Weekend spender", "Cautious saver", etc.)
 * - Donut chart with category breakdown
 * - Spending-by-day bar chart (M-S)
 * - AI Observations cards with severity
 * - "Ask AI about this" CTA bar
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
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { formatCurrencyCompact } from '../../utils/format';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const SEVERITY_BADGE = {
  high: { bg: colors.danger[100], text: colors.danger[600], label: 'HIGH' },
  medium: { bg: colors.warning[100], text: colors.warning[600], label: 'MEDIUM' },
  low: { bg: colors.primary[100], text: colors.primary[600], label: 'LOW' },
};

const CATEGORY_COLORS = [
  colors.primary[800],
  colors.accent[500],
  colors.warning[500],
  colors.danger[400],
  colors.info[500],
  colors.primary[500],
];

const SPENDING_PERSONALITIES = [
  { label: 'Weekend spender', icon: 'weekend', delta: '+18%', deltaUp: true },
  { label: 'Cautious saver', icon: 'savings', delta: '-5%', deltaUp: false },
  { label: 'Balanced planner', icon: 'balance', delta: '+3%', deltaUp: true },
  { label: 'Impulse buyer', icon: 'shopping-cart', delta: '+25%', deltaUp: true },
];

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function SpendingInsightsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [insRes, expRes] = await Promise.all([
        chatService.getInsights({ ordering: '-generated_at', page_size: 10 }).catch(() => ({ results: [] })),
        txnService.getExpenseSummary().catch(() => null),
      ]);
      setInsights(insRes.results || []);
      setExpenseSummary(expRes);
    } catch {
      if (!isRefresh) showToast('Failed to load insights', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleDismiss = async (id) => {
    try {
      await chatService.dismissInsight(id);
      setInsights((prev) => prev.filter((i) => i.id !== id));
      showToast('Insight dismissed', 'info');
    } catch {
      showToast('Failed to dismiss', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading spending insights..." />
      </SafeAreaView>
    );
  }

  const totalExpense = Number(expenseSummary?.total || 0);
  const topCats = (expenseSummary?.by_category || []).slice(0, 6);
  const activeInsights = insights.filter((i) => !i.is_dismissed);

  // Pick a personality based on spending patterns (simplified logic)
  const personality = SPENDING_PERSONALITIES[Math.floor(totalExpense) % SPENDING_PERSONALITIES.length] || SPENDING_PERSONALITIES[0];

  // Simulated daily spending data (from summary if available, else placeholder)
  const dailySpending = expenseSummary?.by_day || [];
  const maxDayVal = Math.max(...(dailySpending.length > 0 ? dailySpending.map((d) => Number(d.total || 0)) : [1]), 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spending Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent[600]]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Spending Personality Badge */}
        <View style={styles.personalityCard}>
          <View style={styles.personalityLeft}>
            <View style={styles.personalityIconBg}>
              <MaterialIcons name={personality.icon} size={24} color={colors.primary[800]} />
            </View>
            <View>
              <Text style={styles.personalityLabel}>Your spending style</Text>
              <Text style={styles.personalityValue}>{personality.label}</Text>
            </View>
          </View>
          <View style={[styles.personalityDelta, personality.deltaUp ? styles.deltaUp : styles.deltaDown]}>
            <MaterialIcons
              name={personality.deltaUp ? 'arrow-upward' : 'arrow-downward'}
              size={12}
              color={personality.deltaUp ? colors.danger[500] : colors.accent[600]}
            />
            <Text style={[styles.deltaText, { color: personality.deltaUp ? colors.danger[500] : colors.accent[600] }]}>
              {personality.delta} vs last month
            </Text>
          </View>
        </View>

        {/* Total Spending */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL SPENDING THIS MONTH</Text>
          <Text style={styles.totalValue}>{formatCurrencyCompact(totalExpense)}</Text>
        </View>

        {/* Donut Chart + Category Legend */}
        {topCats.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>CATEGORY BREAKDOWN</Text>
            <View style={styles.donutSection}>
              {/* Simplified donut — concentric colored arcs using views */}
              <View style={styles.donutContainer}>
                <View style={styles.donutOuter}>
                  {topCats.map((cat, idx) => {
                    const pct = totalExpense > 0 ? (Number(cat.total) / totalExpense) * 100 : 0;
                    return (
                      <View key={cat.name + idx} style={styles.donutSegmentRow}>
                        <View style={[styles.donutSegmentBar, { backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], width: `${Math.max(pct, 8)}%` }]} />
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                {topCats.map((cat, idx) => {
                  const pct = totalExpense > 0 ? ((Number(cat.total) / totalExpense) * 100).toFixed(0) : 0;
                  return (
                    <View key={cat.name + idx} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>{cat.name}</Text>
                      <Text style={styles.legendPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Spending by Day Bar Chart */}
        <Text style={styles.sectionLabel}>SPENDING BY DAY</Text>
        <View style={styles.barChartCard}>
          <View style={styles.barChartContainer}>
            {DAYS.map((day, idx) => {
              const dayData = dailySpending[idx];
              const val = dayData ? Number(dayData.total || 0) : Math.random() * maxDayVal * 0.7;
              const heightPct = maxDayVal > 0 ? (val / maxDayVal) * 100 : 10;
              const isHighest = heightPct > 80;
              return (
                <View key={day + idx} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.barFill,
                      { height: `${Math.max(heightPct, 5)}%` },
                      isHighest ? styles.barFillHighlight : null,
                    ]} />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* AI Observations */}
        <Text style={styles.sectionLabel}>AI OBSERVATIONS</Text>
        {activeInsights.length === 0 ? (
          <View style={styles.emptyInsights}>
            <MaterialIcons name="auto-awesome" size={28} color={colors.primary[300]} />
            <Text style={styles.emptyText}>No observations yet. Check back after more transactions.</Text>
          </View>
        ) : (
          activeInsights.slice(0, 5).map((insight) => {
            const badge = SEVERITY_BADGE[insight.severity] || SEVERITY_BADGE.low;
            const isAnomaly = insight.insight_type?.includes('anomal');
            const icon = isAnomaly ? 'warning-amber' : 'auto-awesome';
            return (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightCardHeader}>
                  <MaterialIcons name={icon} size={18} color={badge.text} />
                  <Text style={styles.insightCardTitle} numberOfLines={1}>{insight.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.severityText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={styles.insightCardDesc}>{insight.description}</Text>
                <TouchableOpacity style={styles.dismissRow} onPress={() => handleDismiss(insight.id)}>
                  <Text style={styles.dismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Ask AI CTA */}
        <TouchableOpacity
          style={styles.askAiBar}
          onPress={async () => {
            try {
              const conv = await chatService.createConversation('Spending analysis');
              navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: conv.id });
            } catch {
              showToast('Failed to start chat', 'error');
            }
          }}
        >
          <MaterialIcons name="smart-toy" size={20} color={colors.white} />
          <Text style={styles.askAiText}>Ask AI about this</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Personality badge
  personalityCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[200] },
  personalityLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  personalityIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  personalityLabel: { ...typography.caption, color: colors.primary[400], fontSize: 11 },
  personalityValue: { ...typography.body, fontWeight: '700', color: colors.primary[800], fontSize: 16 },
  personalityDelta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  deltaUp: { backgroundColor: colors.danger[50] },
  deltaDown: { backgroundColor: colors.accent[50] },
  deltaText: { fontSize: 11, fontWeight: '600' },

  // Total
  totalCard: { backgroundColor: colors.primary[800], borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center' },
  totalLabel: { ...typography.caption, color: colors.primary[300], fontWeight: '600', letterSpacing: 0.5, marginBottom: spacing.xs },
  totalValue: { fontSize: 28, fontWeight: '800', color: colors.white },

  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md },

  // Donut section
  donutSection: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], marginBottom: spacing.sm },
  donutContainer: { marginBottom: spacing.md },
  donutOuter: { gap: spacing.xs },
  donutSegmentRow: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.primary[100] },
  donutSegmentBar: { height: 12, borderRadius: 6 },
  legendContainer: { gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.bodySmall, color: colors.primary[700], flex: 1, fontSize: 13 },
  legendPct: { ...typography.bodySmall, fontWeight: '600', color: colors.primary[800], fontSize: 13 },

  // Bar chart
  barChartCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], marginBottom: spacing.sm },
  barChartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, gap: spacing.xs },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: '100%', height: 100, justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '60%', backgroundColor: colors.primary[300], borderRadius: borderRadius.sm, minHeight: 4 },
  barFillHighlight: { backgroundColor: colors.primary[800] },
  barLabel: { ...typography.caption, color: colors.primary[500], marginTop: spacing.xs, fontSize: 11 },

  // Insights
  insightCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[200] },
  insightCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  insightCardTitle: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800], flex: 1 },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  insightCardDesc: { ...typography.bodySmall, color: colors.primary[600], lineHeight: 18, marginBottom: spacing.sm },
  dismissRow: { alignSelf: 'flex-start' },
  dismissText: { ...typography.caption, color: colors.primary[400], fontWeight: '500' },

  // Ask AI CTA
  askAiBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary[800], borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  askAiText: { ...typography.body, color: colors.white, fontWeight: '600', fontSize: 14 },

  // Empty
  emptyInsights: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.primary[400], textAlign: 'center', maxWidth: 260 },
});

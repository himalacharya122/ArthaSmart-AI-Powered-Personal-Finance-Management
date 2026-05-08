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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { formatCurrencyCompact } from '../../utils/format';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

function KashAISparkle({ size = 20 }) {
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

const SEVERITY_BADGE = {
  high:   { bg: colors.danger[100],  text: colors.danger[600],  label: 'HIGH' },
  medium: { bg: colors.warning[100], text: colors.warning[600], label: 'MEDIUM' },
  low:    { bg: colors.primary[100], text: colors.primary[600], label: 'LOW' },
};

const CATEGORY_COLORS = [
  colors.primary[800],
  colors.accent[500],
  colors.warning[500],
  colors.danger[400],
  '#818CF8',
  colors.primary[400],
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Build YYYY-MM-DD from local date components to avoid UTC offset shifting the day.
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function SpendingInsightsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [insights, setInsights]             = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const dateParams = {
        date_after:  localDateStr(firstOfMonth),
        date_before: localDateStr(today),
      };

      const [insRes, expRes] = await Promise.all([
        chatService.getInsights({ ordering: '-generated_at', page_size: 10 }).catch(() => ({ results: [] })),
        txnService.getExpenseSummary(dateParams).catch(() => null),
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

  const totalExpense   = Number(expenseSummary?.total || 0);
  const topCats        = (expenseSummary?.by_category || []).slice(0, 6);
  const weekdayTotals  = expenseSummary?.by_weekday || [];
  const activeInsights = insights.filter((i) => !i.is_dismissed);
  const maxDayVal      = weekdayTotals.length > 0 ? Math.max(...weekdayTotals, 1) : 1;
  const hasWeekdayData = weekdayTotals.some((v) => v > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spending Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[colors.accent[600]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL SPENDING THIS MONTH</Text>
          <Text style={styles.totalValue}>{formatCurrencyCompact(totalExpense)}</Text>
        </View>

        {/* Category breakdown */}
        <Text style={styles.sectionLabel}>CATEGORY BREAKDOWN</Text>
        {topCats.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.stackedBarTrack}>
              {topCats.map((cat, idx) => {
                const pct = totalExpense > 0 ? (Number(cat.total) / totalExpense) * 100 : 0;
                return (
                  <View
                    key={cat.name + idx}
                    style={{
                      width: `${Math.max(pct, 1)}%`,
                      height: '100%',
                      backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                    }}
                  />
                );
              })}
            </View>
            <View style={styles.legendContainer}>
              {topCats.map((cat, idx) => {
                const pct = totalExpense > 0
                  ? ((Number(cat.total) / totalExpense) * 100).toFixed(0)
                  : '0';
                return (
                  <View key={cat.name + idx} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>{cat.name}</Text>
                    <Text style={styles.legendAmount}>{formatCurrencyCompact(Number(cat.total))}</Text>
                    <Text style={styles.legendPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={[styles.card, styles.emptyCard]}>
            <MaterialIcons name="pie-chart-outline" size={28} color={colors.primary[300]} />
            <Text style={styles.emptyText}>No expenses recorded this month.</Text>
          </View>
        )}

        {/* Spending by day of week */}
        {hasWeekdayData && (
          <>
            <Text style={styles.sectionLabel}>SPENDING BY DAY OF WEEK</Text>
            <View style={styles.card}>
              <View style={styles.barChartContainer}>
                {DAYS.map((day, idx) => {
                  const val = weekdayTotals[idx] || 0;
                  const heightPct = maxDayVal > 0 ? (val / maxDayVal) * 100 : 0;
                  const isHighest = val === maxDayVal && val > 0;
                  return (
                    <View key={day} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[
                          styles.barFill,
                          { height: `${Math.max(heightPct, heightPct > 0 ? 5 : 0)}%` },
                          isHighest && styles.barFillHighlight,
                        ]} />
                      </View>
                      <Text style={styles.barLabel}>{day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* AI observations */}
        <Text style={styles.sectionLabel}>AI OBSERVATIONS</Text>
        {activeInsights.length === 0 ? (
          <View style={[styles.card, styles.emptyCard]}>
            <MaterialIcons name="auto-awesome" size={28} color={colors.primary[300]} />
            <Text style={styles.emptyText}>No observations yet. Check back after more transactions.</Text>
          </View>
        ) : (
          activeInsights.slice(0, 5).map((insight) => {
            const badge  = SEVERITY_BADGE[insight.severity] || SEVERITY_BADGE.low;
            const isAnom = insight.insight_type?.includes('anomal');
            return (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightCardHeader}>
                  <MaterialIcons
                    name={isAnom ? 'warning-amber' : 'auto-awesome'}
                    size={18}
                    color={badge.text}
                  />
                  <Text style={styles.insightCardTitle} numberOfLines={1}>{insight.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.severityText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={styles.insightCardDesc}>{insight.description}</Text>
                <View style={styles.insightActions}>
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => handleDismiss(insight.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={13} color={colors.primary[500]} />
                    <Text style={styles.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.askAiBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(SCREEN_NAMES.AI_CHAT, {})}
        >
          <View style={styles.askAiIconBg}>
            <KashAISparkle size={18} />
          </View>
          <Text style={styles.askAiText}>Ask AI about your spending</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.primary[600]} />
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  backBtn: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.xs,
    ...shadow.sm,
  },

  totalCard: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xs,
    ...shadow.sm,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.primary[300],
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  totalValue: { fontSize: 32, fontWeight: '800', color: colors.white },

  stackedBarTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.primary[100],
    marginBottom: spacing.md,
  },
  legendContainer: { gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendLabel: { ...typography.bodySmall, color: colors.primary[700], flex: 1, fontSize: 13 },
  legendAmount: { ...typography.bodySmall, color: colors.primary[500], fontSize: 12 },
  legendPct: { ...typography.bodySmall, fontWeight: '700', color: colors.primary[800], fontSize: 13, minWidth: 34, textAlign: 'right' },

  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    gap: 4,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 },
  barFill: { width: '70%', backgroundColor: colors.primary[200], borderRadius: 3, minHeight: 0 },
  barFillHighlight: { backgroundColor: colors.primary[700] },
  barLabel: { ...typography.caption, color: colors.primary[400], fontSize: 10 },

  insightCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  insightCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs + 2 },
  insightCardTitle: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800], flex: 1 },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  insightCardDesc: { ...typography.bodySmall, color: colors.primary[600], lineHeight: 18, marginBottom: spacing.sm },
  insightActions: { flexDirection: 'row' },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  dismissText: { ...typography.caption, color: colors.primary[500], fontWeight: '600', fontSize: 12 },

  askAiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
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

  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.primary[400], textAlign: 'center', maxWidth: 240 },
});

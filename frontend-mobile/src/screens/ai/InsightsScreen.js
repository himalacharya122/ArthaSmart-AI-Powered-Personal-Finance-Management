/**
 * AI Insights / Spending Insights screen.
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
import { formatCurrencyCompact, formatPercent } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';

const SEVERITY_BADGE = {
  high: { bg: colors.danger[100], text: colors.danger[600], label: 'HIGH' },
  medium: { bg: colors.warning[100], text: colors.warning[600], label: 'MEDIUM' },
  low: { bg: colors.primary[100], text: colors.primary[600], label: 'LOW' },
};

export function InsightsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [incomeSummary, setIncomeSummary] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [insRes, expRes, incRes] = await Promise.all([
        chatService.getInsights({ ordering: '-generated_at', page_size: 20 }).catch(() => ({ results: [] })),
        txnService.getExpenseSummary().catch(() => null),
        txnService.getIncomeSummary().catch(() => null),
      ]);
      setInsights(insRes.results || []);
      setExpenseSummary(expRes);
      setIncomeSummary(incRes);
    } catch {
      if (!isRefresh) showToast('Failed to load insights', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await chatService.generateInsights();
      showToast(`Generated ${res.generated || 0} new insights!`, 'success');
      fetchData(true);
    } catch {
      showToast('Failed to generate insights', 'error');
    } finally {
      setGenerating(false);
    }
  };

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
        <LoadingSpinner message="Loading insights..." />
      </SafeAreaView>
    );
  }

  const totalExpense = Number(expenseSummary?.total || 0);
  const totalIncome = Number(incomeSummary?.total || 0);
  const savings = totalIncome - totalExpense;
  const topCats = (expenseSummary?.by_category || []).slice(0, 4);

  const activeInsights = insights.filter((i) => !i.is_dismissed);

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
        {/* Summary Grid */}
        <Text style={styles.sectionLabel}>SUMMARY</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>TOTAL INCOME</Text>
            <Text style={styles.summaryCardValue}>{formatCurrencyCompact(totalIncome)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>TOTAL EXPENSES</Text>
            <Text style={styles.summaryCardValue}>{formatCurrencyCompact(totalExpense)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>NET SAVINGS</Text>
            <Text style={[styles.summaryCardValue, { color: savings >= 0 ? colors.accent[600] : colors.danger[500] }]}>
              {formatCurrencyCompact(Math.abs(savings))}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>SAVINGS RATE</Text>
            <Text style={[styles.summaryCardValue, { color: savings >= 0 ? colors.accent[600] : colors.danger[500] }]}>
              {totalIncome > 0 ? formatPercent((savings / totalIncome) * 100) : '0%'}
            </Text>
          </View>
        </View>

        {/* Top Categories */}
        {topCats.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TOP CATEGORIES</Text>
            <View style={styles.catSection}>
              {topCats.map((cat, idx) => {
                const maxVal = Number(topCats[0]?.total) || 1;
                const pct = (Number(cat.total) / maxVal) * 100;
                return (
                  <View key={cat.name + idx} style={styles.catRow}>
                    <View style={[styles.catIcon, { backgroundColor: (cat.color || colors.primary[400]) + '20' }]}>
                      <MaterialIcons name="circle" size={8} color={cat.color || colors.primary[400]} />
                    </View>
                    <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color || colors.primary[500] }]} />
                    </View>
                    <Text style={styles.catAmount}>{formatCurrencyCompact(cat.total)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* AI Insights / Alerts */}
        <View style={styles.insightsSectionHeader}>
          <Text style={styles.sectionLabel}>AI OBSERVATIONS</Text>
          <Button
            title={generating ? 'Generating...' : 'Generate'}
            onPress={handleGenerate}
            variant="outline"
            size="sm"
            loading={generating}
            icon={<MaterialIcons name="auto-awesome" size={14} color={colors.accent[600]} />}
          />
        </View>

        {activeInsights.length === 0 ? (
          <View style={styles.emptyInsights}>
            <MaterialIcons name="auto-awesome" size={32} color={colors.primary[300]} />
            <Text style={styles.emptyText}>No insights yet. Tap Generate to analyze your spending.</Text>
          </View>
        ) : (
          activeInsights.map((insight) => {
            const badge = SEVERITY_BADGE[insight.severity] || SEVERITY_BADGE.low;
            const isAnomaly = insight.insight_type?.includes('anomal');
            const isBudget = insight.insight_type?.includes('budget');
            const icon = isAnomaly ? 'warning-amber' : isBudget ? 'trending-up' : 'auto-awesome';

            return (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightCardHeader}>
                  <MaterialIcons name={icon} size={20} color={badge.text} />
                  <Text style={styles.insightCardTitle} numberOfLines={1}>{insight.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.severityText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={styles.insightCardDesc}>{insight.description}</Text>
                <View style={styles.insightCardActions}>
                  <TouchableOpacity style={styles.dismissBtn} onPress={() => handleDismiss(insight.id)}>
                    <Text style={styles.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.askAiBtn} onPress={() => {
                    showToast('Opening AI chat...', 'info');
                    // Could start a new conversation about this insight
                  }}>
                    <Text style={styles.askAiText}>Ask AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

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
  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md },

  // Summary
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  summaryCard: { width: '48%', backgroundColor: colors.primary[100], borderRadius: borderRadius.md, padding: spacing.md },
  summaryCardLabel: { ...typography.caption, fontWeight: '600', color: colors.primary[500], letterSpacing: 0.3, marginBottom: spacing.xs },
  summaryCardValue: { ...typography.h3, fontSize: 18, color: colors.primary[800] },

  // Categories
  catSection: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], marginBottom: spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  catIcon: { width: 32, height: 32, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  catName: { ...typography.bodySmall, color: colors.primary[700], fontWeight: '500', width: 90 },
  catBarBg: { flex: 1, height: 6, backgroundColor: colors.primary[100], borderRadius: 3, marginHorizontal: spacing.sm, overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 3 },
  catAmount: { ...typography.bodySmall, fontWeight: '600', color: colors.primary[800], width: 80, textAlign: 'right' },

  // Insights
  insightsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  insightCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[200] },
  insightCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  insightCardTitle: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800], flex: 1 },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  insightCardDesc: { ...typography.bodySmall, color: colors.primary[600], lineHeight: 18, marginBottom: spacing.sm },
  insightCardActions: { flexDirection: 'row', gap: spacing.sm },
  dismissBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primary[200] },
  dismissText: { ...typography.bodySmall, color: colors.primary[600], fontWeight: '500' },
  askAiBtn: { flex: 1, backgroundColor: colors.primary[800], paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignItems: 'center' },
  askAiText: { color: colors.white, fontWeight: '600', fontSize: 13 },

  // Empty
  emptyInsights: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.primary[400], textAlign: 'center', maxWidth: 260 },
});

/**
 * Financial Report — Monthly financial health report.
 *
 * Features:
 * - Health score ring (0-100 with "Good"/"Fair"/"Poor" label)
 * - Summary grid: Income, Expenses, Savings, Avg Daily
 * - Top categories with horizontal progress bars
 * - AI Summary paragraph
 * - Budget goals with progress bars (met/unmet)
 * - Export PDF + Ask AI action buttons
 * - Month picker in header
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
import { format, subMonths, addMonths } from 'date-fns';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { formatCurrencyCompact, formatPercent } from '../../utils/format';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

function getHealthScore(income, expense) {
  if (income <= 0) return { score: 0, label: 'No Data', color: colors.primary[400] };
  const savingsRate = ((income - expense) / income) * 100;
  if (savingsRate >= 30) return { score: Math.min(95, 70 + savingsRate), label: 'Excellent', color: colors.accent[600] };
  if (savingsRate >= 15) return { score: Math.min(85, 60 + savingsRate), label: 'Good', color: colors.accent[500] };
  if (savingsRate >= 5) return { score: Math.min(70, 40 + savingsRate), label: 'Fair', color: colors.warning[500] };
  if (savingsRate >= 0) return { score: Math.max(30, savingsRate * 5), label: 'Needs Attention', color: colors.warning[600] };
  return { score: Math.max(10, 30 + savingsRate), label: 'Critical', color: colors.danger[500] };
}

const SAMPLE_BUDGETS = [
  { name: 'Food & Dining', budget: 15000, spent: 12300, met: true },
  { name: 'Transport', budget: 5000, spent: 4200, met: true },
  { name: 'Shopping', budget: 8000, spent: 11500, met: false },
  { name: 'Entertainment', budget: 3000, spent: 2100, met: true },
];

export function FinancialReportScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [incomeSummary, setIncomeSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [expRes, incRes, insRes] = await Promise.all([
        txnService.getExpenseSummary().catch(() => null),
        txnService.getIncomeSummary().catch(() => null),
        chatService.getInsights({ ordering: '-generated_at', page_size: 5 }).catch(() => ({ results: [] })),
      ]);
      setExpenseSummary(expRes);
      setIncomeSummary(incRes);
      setInsights(insRes.results || []);
    } catch {
      if (!isRefresh) showToast('Failed to load report', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading financial report..." />
      </SafeAreaView>
    );
  }

  const totalExpense = Number(expenseSummary?.total || 0);
  const totalIncome = Number(incomeSummary?.total || 0);
  const savings = totalIncome - totalExpense;
  const daysInMonth = 30;
  const avgDaily = totalExpense > 0 ? totalExpense / daysInMonth : 0;
  const health = getHealthScore(totalIncome, totalExpense);
  const topCats = (expenseSummary?.by_category || []).slice(0, 5);
  const maxCatVal = Number(topCats[0]?.total || 1);

  // AI summary from insights
  const aiSummary = insights.length > 0
    ? insights.slice(0, 2).map((i) => i.description).join(' ')
    : 'Add more transactions to get a detailed AI summary of your financial health this month.';

  const monthLabel = format(selectedMonth, 'MMMM yyyy');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with month picker */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
            <MaterialIcons name="chevron-left" size={24} color={colors.primary[600]} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
            <MaterialIcons name="chevron-right" size={24} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent[600]]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Health Score Ring */}
        <View style={styles.scoreCard}>
          <View style={[styles.scoreRing, { borderColor: health.color }]}>
            <Text style={[styles.scoreValue, { color: health.color }]}>{Math.round(health.score)}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: health.color }]}>{health.label}</Text>
          <Text style={styles.scoreDesc}>Financial Health Score</Text>
        </View>

        {/* Summary Grid */}
        <Text style={styles.sectionLabel}>SUMMARY</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>INCOME</Text>
            <Text style={[styles.summaryCardValue, { color: colors.accent[600] }]}>{formatCurrencyCompact(totalIncome)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>EXPENSES</Text>
            <Text style={[styles.summaryCardValue, { color: colors.danger[500] }]}>{formatCurrencyCompact(totalExpense)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>SAVINGS</Text>
            <Text style={[styles.summaryCardValue, { color: savings >= 0 ? colors.accent[600] : colors.danger[500] }]}>
              {formatCurrencyCompact(Math.abs(savings))}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>AVG / DAY</Text>
            <Text style={styles.summaryCardValue}>{formatCurrencyCompact(avgDaily)}</Text>
          </View>
        </View>

        {/* Top Categories */}
        {topCats.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TOP CATEGORIES</Text>
            <View style={styles.catsCard}>
              {topCats.map((cat, idx) => {
                const pct = (Number(cat.total) / maxCatVal) * 100;
                return (
                  <View key={cat.name + idx} style={styles.catRow}>
                    <View style={styles.catInfo}>
                      <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                      <Text style={styles.catAmount}>{formatCurrencyCompact(cat.total)}</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color || colors.primary[600] }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* AI Summary */}
        <Text style={styles.sectionLabel}>AI SUMMARY</Text>
        <View style={styles.aiSummaryCard}>
          <View style={styles.aiSummaryHeader}>
            <MaterialIcons name="smart-toy" size={18} color={colors.primary[600]} />
            <Text style={styles.aiSummaryTitle}>Finny's Analysis</Text>
          </View>
          <Text style={styles.aiSummaryText}>{aiSummary}</Text>
        </View>

        {/* Budget Goals */}
        <Text style={styles.sectionLabel}>BUDGET GOALS</Text>
        <View style={styles.budgetCard}>
          {SAMPLE_BUDGETS.map((b, idx) => {
            const pct = Math.min((b.spent / b.budget) * 100, 100);
            const over = b.spent > b.budget;
            return (
              <View key={b.name + idx} style={styles.budgetRow}>
                <View style={styles.budgetInfo}>
                  <Text style={styles.budgetName}>{b.name}</Text>
                  <Text style={[styles.budgetStatus, over ? styles.budgetOver : styles.budgetMet]}>
                    {over ? 'Over budget' : 'On track'}
                  </Text>
                </View>
                <View style={styles.budgetBarBg}>
                  <View style={[
                    styles.budgetBarFill,
                    { width: `${pct}%` },
                    over ? styles.budgetBarOver : styles.budgetBarOk,
                  ]} />
                </View>
                <Text style={styles.budgetAmounts}>
                  {formatCurrencyCompact(b.spent)} / {formatCurrencyCompact(b.budget)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={() => showToast('Export PDF coming soon', 'info')}>
            <MaterialIcons name="picture-as-pdf" size={18} color={colors.primary[700]} />
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.askAiBtn}
            onPress={async () => {
              try {
                const conv = await chatService.createConversation('Monthly report');
                navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: conv.id });
              } catch {
                showToast('Failed to start chat', 'error');
              }
            }}
          >
            <MaterialIcons name="smart-toy" size={18} color={colors.white} />
            <Text style={styles.askAiBtnText}>Ask AI</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthLabel: { ...typography.body, fontWeight: '600', color: colors.primary[800], fontSize: 16 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md },

  // Health Score
  scoreCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[200] },
  scoreRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  scoreValue: { fontSize: 32, fontWeight: '800' },
  scoreMax: { fontSize: 14, color: colors.primary[400], fontWeight: '500', marginTop: -4 },
  scoreLabel: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  scoreDesc: { ...typography.bodySmall, color: colors.primary[400] },

  // Summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  summaryCard: { width: '48%', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200] },
  summaryCardLabel: { ...typography.caption, fontWeight: '600', color: colors.primary[400], letterSpacing: 0.3, marginBottom: spacing.xs },
  summaryCardValue: { ...typography.h3, fontSize: 18, color: colors.primary[800] },

  // Categories
  catsCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], marginBottom: spacing.sm },
  catRow: { marginBottom: spacing.sm },
  catInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  catName: { ...typography.bodySmall, color: colors.primary[700], fontWeight: '500' },
  catAmount: { ...typography.bodySmall, fontWeight: '600', color: colors.primary[800] },
  catBarBg: { height: 8, backgroundColor: colors.primary[100], borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },

  // AI Summary
  aiSummaryCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], marginBottom: spacing.sm },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  aiSummaryTitle: { ...typography.body, fontWeight: '600', color: colors.primary[800], fontSize: 14 },
  aiSummaryText: { ...typography.bodySmall, color: colors.primary[600], lineHeight: 20 },

  // Budget goals
  budgetCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], marginBottom: spacing.sm },
  budgetRow: { marginBottom: spacing.md },
  budgetInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  budgetName: { ...typography.bodySmall, color: colors.primary[700], fontWeight: '500' },
  budgetStatus: { fontSize: 11, fontWeight: '600' },
  budgetMet: { color: colors.accent[600] },
  budgetOver: { color: colors.danger[500] },
  budgetBarBg: { height: 8, backgroundColor: colors.primary[100], borderRadius: 4, overflow: 'hidden', marginBottom: spacing.xs },
  budgetBarFill: { height: 8, borderRadius: 4 },
  budgetBarOk: { backgroundColor: colors.accent[500] },
  budgetBarOver: { backgroundColor: colors.danger[400] },
  budgetAmounts: { ...typography.caption, color: colors.primary[400], fontSize: 11 },

  // Action buttons
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, paddingVertical: spacing.sm + 4, borderWidth: 1, borderColor: colors.primary[300] },
  exportBtnText: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  askAiBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary[800], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 4 },
  askAiBtnText: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.white },
});

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
import { LinearGradient } from 'expo-linear-gradient';
import { format, subMonths, addMonths, getDaysInMonth, isSameMonth } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { formatCurrencyCompact } from '../../utils/format';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import * as txnService from '../../services/transactions';
import api from '../../services/api';
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

function getHealthScore(income, expense) {
  if (income <= 0) return { score: 0, label: 'No Data', color: colors.primary[400] };
  const savingsRate = ((income - expense) / income) * 100;
  if (savingsRate >= 30) return { score: Math.min(95, 70 + savingsRate), label: 'Excellent', color: colors.accent[600] };
  if (savingsRate >= 15) return { score: Math.min(85, 60 + savingsRate), label: 'Good', color: colors.accent[500] };
  if (savingsRate >= 5)  return { score: Math.min(70, 40 + savingsRate), label: 'Fair', color: colors.warning[500] };
  if (savingsRate >= 0)  return { score: Math.max(30, savingsRate * 5), label: 'Needs Attention', color: colors.warning[600] };
  return { score: Math.max(10, 30 + savingsRate), label: 'Critical', color: colors.danger[500] };
}

// Timezone-safe YYYY-MM-DD string using local date components
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDateParams(month) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastOfMonth  = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const today        = new Date();
  const dateBefore   = isSameMonth(month, today) ? today : lastOfMonth;
  return { date_after: localDateStr(firstOfMonth), date_before: localDateStr(dateBefore) };
}

function buildAiAnalysis(totalIncome, totalExpense, topCats, health) {
  if (totalIncome === 0 && totalExpense === 0) {
    return 'No transactions recorded this month. Add expenses and income to see a personalised financial analysis.';
  }
  const savings = totalIncome - totalExpense;
  const parts = [];

  parts.push(`Your financial health is ${health.label.toLowerCase()} with a score of ${Math.round(health.score)}/100.`);

  if (totalIncome > 0 && savings >= 0) {
    const pct = ((savings / totalIncome) * 100).toFixed(0);
    parts.push(`You saved ${formatCurrencyCompact(savings)} (${pct}% of income) this month.`);
  } else if (totalIncome > 0 && savings < 0) {
    parts.push(`Expenses exceeded income by ${formatCurrencyCompact(Math.abs(savings))} - review your spending to get back on track.`);
  } else {
    parts.push(`Total spending was ${formatCurrencyCompact(totalExpense)} with no recorded income this month.`);
  }

  if (topCats.length > 0) {
    const top = topCats[0];
    const pct = totalExpense > 0 ? ((Number(top.total) / totalExpense) * 100).toFixed(0) : 0;
    parts.push(`Your largest expense category was ${top.name} at ${formatCurrencyCompact(Number(top.total))} (${pct}% of spending).`);
  }

  if (health.label === 'Excellent') {
    parts.push("You're on an excellent financial track. Keep building your savings.");
  } else if (health.label === 'Good') {
    parts.push('A small increase in your savings rate will push you into excellent territory.');
  } else if (health.label === 'Fair') {
    parts.push('Try reducing your top spending categories to meaningfully improve your savings rate.');
  } else if (health.label === 'Needs Attention' || health.label === 'Critical') {
    parts.push('Review your spending urgently and identify categories where costs can be reduced immediately.');
  }

  return parts.join(' ');
}

export function FinancialReportScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [incomeSummary, setIncomeSummary]   = useState(null);
  const [budgets, setBudgets]           = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const fetchData = useCallback(async (month, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const dateParams = buildDateParams(month);
      const [expRes, incRes, budRes] = await Promise.all([
        txnService.getExpenseSummary(dateParams).catch(() => null),
        txnService.getIncomeSummary(dateParams).catch(() => null),
        api.get('/api/v1/budgets/', { params: { is_active: true, page_size: 20 } })
          .then((r) => r.data.results || [])
          .catch(() => []),
      ]);
      setExpenseSummary(expRes);
      setIncomeSummary(incRes);
      setBudgets(budRes);
    } catch {
      if (!isRefresh) showToast('Failed to load report', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Re-runs whenever the screen gains focus or selectedMonth changes
  useFocusEffect(useCallback(() => { fetchData(selectedMonth); }, [fetchData, selectedMonth]));

  const totalExpense = Number(expenseSummary?.total || 0);
  const totalIncome  = Number(incomeSummary?.total  || 0);
  const savings      = totalIncome - totalExpense;
  const today        = new Date();
  const daysElapsed  = isSameMonth(selectedMonth, today) ? today.getDate() : getDaysInMonth(selectedMonth);
  const avgDaily     = totalExpense > 0 ? totalExpense / daysElapsed : 0;
  const health       = getHealthScore(totalIncome, totalExpense);
  const topCats      = (expenseSummary?.by_category || []).slice(0, 5);
  const maxCatVal    = Number(topCats[0]?.total || 1);
  const aiSummary    = buildAiAnalysis(totalIncome, totalExpense, topCats, health);
  const monthLabel   = format(selectedMonth, 'MMMM yyyy');

  const handleExportPdf = async () => {
    try {
      const catRows = topCats.map((c) =>
        `<tr><td>${c.name}</td><td style="text-align:right">Rs. ${Number(c.total).toLocaleString()}</td></tr>`
      ).join('');

      const budgetRows = budgets.map((b) => {
        const over = b.is_over_budget;
        return `<tr>
          <td>${b.name}</td>
          <td style="text-align:right">Rs. ${Number(b.amount).toLocaleString()}</td>
          <td style="text-align:right">Rs. ${Number(b.spent).toLocaleString()}</td>
          <td style="color:${over ? '#ef4444' : '#10b981'}">${over ? 'Over Budget' : 'On Track'}</td>
        </tr>`;
      }).join('');

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, Helvetica, sans-serif; padding: 32px; color: #1e3a5f; font-size: 14px; }
              h1 { font-size: 24px; margin-bottom: 4px; }
              .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
              .score { font-size: 40px; font-weight: 800; color: ${health.color}; }
              .score-label { color: ${health.color}; font-weight: 600; font-size: 16px; margin-bottom: 24px; }
              .grid { display: flex; gap: 12px; margin-bottom: 24px; }
              .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
              .card-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
              .card-value { font-size: 18px; font-weight: 700; margin-top: 6px; }
              h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 24px 0 8px; letter-spacing: 0.5px; }
              table { width: 100%; border-collapse: collapse; }
              th { text-align: left; padding: 6px 0; border-bottom: 2px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-transform: uppercase; }
              td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
              .ai-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; line-height: 1.7; color: #475569; }
              .footer { margin-top: 40px; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            </style>
          </head>
          <body>
            <h1>Financial Report</h1>
            <div class="sub">${monthLabel} &nbsp;·&nbsp; Generated by Squirrel</div>

            <div class="score">${Math.round(health.score)}<span style="font-size:20px;color:#94a3b8">/100</span></div>
            <div class="score-label">${health.label} &nbsp;·&nbsp; Financial Health Score</div>

            <div class="grid">
              <div class="card">
                <div class="card-label">Income</div>
                <div class="card-value" style="color:#10b981">Rs. ${totalIncome.toLocaleString()}</div>
              </div>
              <div class="card">
                <div class="card-label">Expenses</div>
                <div class="card-value" style="color:#ef4444">Rs. ${totalExpense.toLocaleString()}</div>
              </div>
              <div class="card">
                <div class="card-label">Savings</div>
                <div class="card-value" style="color:${savings >= 0 ? '#10b981' : '#ef4444'}">Rs. ${Math.abs(savings).toLocaleString()}</div>
              </div>
              <div class="card">
                <div class="card-label">Avg / Day</div>
                <div class="card-value">Rs. ${Math.round(avgDaily).toLocaleString()}</div>
              </div>
            </div>

            ${topCats.length > 0 ? `
              <h2>Top Categories</h2>
              <table>
                <tr><th>Category</th><th style="text-align:right">Amount</th></tr>
                ${catRows}
              </table>
            ` : ''}

            <h2>Squirrel AI Analysis</h2>
            <div class="ai-box">${aiSummary}</div>

            ${budgets.length > 0 ? `
              <h2>Budget Goals</h2>
              <table>
                <tr><th>Name</th><th style="text-align:right">Budget</th><th style="text-align:right">Spent</th><th>Status</th></tr>
                ${budgetRows}
              </table>
            ` : ''}

            <div class="footer">
              Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              &nbsp;·&nbsp; Squirrel
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Financial Report' });
      } else {
        showToast('Sharing not available on this device', 'error');
      }
    } catch {
      showToast('Failed to export PDF', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading financial report..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => setSelectedMonth((m) => subMonths(m, 1))}>
            <MaterialIcons name="chevron-left" size={24} color={colors.primary[600]} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => setSelectedMonth((m) => addMonths(m, 1))}>
            <MaterialIcons name="chevron-right" size={24} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(selectedMonth, true)}
            colors={[colors.accent[600]]}
          />
        }
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

        {/* Squirrel AI Analysis */}
        <Text style={styles.sectionLabel}>SQUIRREL AI ANALYSIS</Text>
        <View style={styles.aiSummaryCard}>
          <View style={styles.aiSummaryHeader}>
            <View style={styles.aiIconBg}>
              <AISparkle size={16} />
            </View>
            <Text style={styles.aiSummaryTitle}>Squirrel AI Analysis</Text>
          </View>
          <Text style={styles.aiSummaryText}>{aiSummary}</Text>
        </View>

        {/* Budget Goals */}
        {budgets.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>BUDGET GOALS</Text>
            <View style={styles.budgetCard}>
              {budgets.map((b, idx) => {
                const pct  = Math.min((Number(b.spent) / Number(b.amount)) * 100, 100);
                const over = b.is_over_budget;
                return (
                  <View key={b.id || idx} style={[styles.budgetRow, idx < budgets.length - 1 && styles.budgetRowBorder]}>
                    <View style={styles.budgetInfo}>
                      <Text style={styles.budgetName}>{b.name}</Text>
                      <Text style={[styles.budgetStatus, over ? styles.budgetOver : styles.budgetMet]}>
                        {over ? 'Over budget' : 'On track'}
                      </Text>
                    </View>
                    <View style={styles.budgetBarBg}>
                      <View style={[styles.budgetBarFill, { width: `${pct}%` }, over ? styles.budgetBarOver : styles.budgetBarOk]} />
                    </View>
                    <Text style={styles.budgetAmounts}>
                      {formatCurrencyCompact(Number(b.spent))} / {formatCurrencyCompact(Number(b.amount))}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportPdf} activeOpacity={0.8}>
            <MaterialIcons name="picture-as-pdf" size={18} color={colors.primary[700]} />
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.askAiBtn}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                const conv = await chatService.createConversation('Monthly report');
                navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: conv.id });
              } catch {
                showToast('Failed to start chat', 'error');
              }
            }}
          >
            <View style={styles.askAiBtnIcon}>
              <AISparkle size={16} />
            </View>
            <Text style={styles.askAiBtnText}>Ask Squirrel AI</Text>
          </TouchableOpacity>
        </View>

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
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthLabel: { ...typography.body, fontWeight: '600', color: colors.primary[800], fontSize: 16 },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },

  scoreCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  scoreValue: { fontSize: 32, fontWeight: '800' },
  scoreMax: { fontSize: 14, color: colors.primary[400], fontWeight: '500', marginTop: -4 },
  scoreLabel: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  scoreDesc: { ...typography.bodySmall, color: colors.primary[400] },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  summaryCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  summaryCardLabel: { ...typography.caption, fontWeight: '600', color: colors.primary[500], marginBottom: spacing.xs },
  summaryCardValue: { ...typography.h3, fontSize: 18, color: colors.primary[800] },

  catsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.xs,
    ...shadow.sm,
  },
  catRow: { marginBottom: spacing.sm },
  catInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  catName: { ...typography.bodySmall, color: colors.primary[700], fontWeight: '500' },
  catAmount: { ...typography.bodySmall, fontWeight: '600', color: colors.primary[800] },
  catBarBg: { height: 8, backgroundColor: colors.primary[100], borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },

  aiSummaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.xs,
    ...shadow.sm,
  },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  aiIconBg: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSummaryTitle: { ...typography.body, fontWeight: '600', color: colors.primary[800], fontSize: 14 },
  aiSummaryText: { ...typography.bodySmall, color: colors.primary[600], lineHeight: 20 },

  budgetCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.xs,
    ...shadow.sm,
  },
  budgetRow: { paddingVertical: spacing.sm },
  budgetRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
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

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.primary[200],
    ...shadow.sm,
  },
  exportBtnText: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  askAiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
  },
  askAiBtnIcon: { alignItems: 'center', justifyContent: 'center' },
  askAiBtnText: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.white },
});

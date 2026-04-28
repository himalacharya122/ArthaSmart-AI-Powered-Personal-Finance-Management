import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import {
  formatCurrency,
  formatCurrencyShort,
  formatDate,
  formatPercent,
} from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import * as dashboardService from '../../services/dashboard';
import * as txnService from '../../services/transactions';
import { storage } from '../../utils/storage';
import { getCurrentBudgetPeriod, toApiDate } from '../../utils/budget';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = spacing.lg;

/* Greeting helper */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

/* Map category name → MaterialIcon */
function mapCategoryIcon(name) {
  const map = {
    'Food & Dining': 'restaurant',
    'Food': 'restaurant',
    'Transport': 'directions-car',
    'Transportation': 'directions-car',
    'Shopping': 'shopping-bag',
    'Utilities': 'bolt',
    'Health': 'favorite',
    'Healthcare': 'favorite',
    'Education': 'school',
    'Entertainment': 'movie',
    'Groceries': 'local-grocery-store',
    'Rent': 'home',
    'Housing': 'home',
    'Salary': 'account-balance-wallet',
    'Freelance': 'laptop',
    'Investment': 'trending-up',
    'Gift': 'card-giftcard',
  };
  return map[name] || 'more-horiz';
}

/* Remaining This Month hero card */
function RemainingCard({ income, expenses, savingsRate, monthlyBudget }) {
  const inc = Number(income) || 0;
  const exp = Number(expenses) || 0;
  const remaining = inc - exp;
  const pctUsed = inc > 0 ? Math.min((exp / inc) * 100, 100) : 0;
  const saved = Number(savingsRate) || 0;
  const isPositive = remaining >= 0;

  // Budget usage bar (replaces calendar pacing). Falls back to income-based
  // ratio if user hasn't set a monthly spending budget.
  const budget = Number(monthlyBudget) || 0;
  const hasBudget = budget > 0;
  const usagePct = hasBudget
    ? Math.min((exp / budget) * 100, 100)
    : (inc > 0 ? Math.min((exp / inc) * 100, 100) : 0);
  const isOverBudget = hasBudget && exp > budget;
  const usageColor = isOverBudget
    ? colors.danger[500]
    : usagePct >= 80
      ? colors.warning[500]
      : colors.primary[900];

  return (
    <View style={styles.remainingCard}>
      {/* Top: label + savings ring */}
      <View style={styles.remainingTopRow}>
        <View style={styles.remainingLeft}>
          <Text style={styles.remainingLabel}>REMAINING THIS MONTH</Text>
          <Text style={[styles.remainingAmount, { color: isPositive ? colors.primary[900] : colors.danger[500] }]}>
            {formatCurrency(Math.abs(remaining))}
          </Text>
          {inc > 0 && (
            <View style={styles.remainingTrendRow}>
              <MaterialIcons
                name={isPositive ? 'arrow-upward' : 'arrow-downward'}
                size={13}
                color={isPositive ? colors.accent[600] : colors.danger[500]}
              />
              <Text style={[styles.remainingTrendText, { color: isPositive ? colors.accent[600] : colors.danger[500] }]}>
                {formatPercent(Math.abs(pctUsed))} used
              </Text>
            </View>
          )}
        </View>

        {/* Savings circle */}
        <View style={styles.savingsCircleWrap}>
          <View style={styles.savingsCircle}>
            <Text style={styles.savingsPct}>{Math.round(saved)}%</Text>
            <Text style={styles.savingsLabel}>SAVED</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.remainingDivider} />

      {/* Spent / Income row */}
      <View style={styles.remainingStatsRow}>
        <View style={styles.remainingStat}>
          <View>
            <Text style={styles.remainingStatLabel}>SPENT</Text>
            <Text style={styles.remainingStatValue}>{formatCurrency(exp)}</Text>
          </View>
        </View>
        <View style={styles.remainingStatSep} />
        <View style={styles.remainingStat}>
          <View>
            <Text style={styles.remainingStatLabel}>INCOME</Text>
            <Text style={styles.remainingStatValue}>{formatCurrency(inc)}</Text>
          </View>
        </View>
      </View>

      {/* Budget usage bar — actual spending vs monthly budget (or income if unset) */}
      <View style={styles.pacingRow}>
        <Text style={styles.pacingLabel}>
          {hasBudget
            ? `${formatCurrency(exp).replace(/\.\d+$/, '')} of ${formatCurrency(budget).replace(/\.\d+$/, '')}`
            : 'Spent vs income'}
        </Text>
        <Text style={[styles.pacingPct, isOverBudget && { color: colors.danger[500] }]}>
          {Math.round(usagePct)}% used{isOverBudget ? ' · over' : ''}
        </Text>
      </View>
      <View style={styles.pacingBarBg}>
        <View
          style={[
            styles.pacingBarFill,
            { width: `${usagePct}%`, backgroundColor: usageColor },
          ]}
        />
      </View>
    </View>
  );
}

/* Budget carousel card */
function BudgetCard({ cat }) {
  const spent = Number(cat.spent) || 0;
  const limit = Number(cat.limit) || 0;
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const isAtRisk = pct >= 80;
  const isOver = pct >= 100;
  const accent = isOver
    ? colors.danger[500]
    : isAtRisk
      ? colors.warning[500]
      : colors.accent[500];

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetCardTop}>
        <Text style={styles.budgetCardName} numberOfLines={1}>{cat.name}</Text>
        <Text style={[styles.budgetPctText, { color: accent }]}>{Math.round(pct)}%</Text>
      </View>

      <View style={styles.budgetBarBg}>
        <View style={[styles.budgetBarFill, { width: `${pct}%`, backgroundColor: accent }]} />
      </View>

      <Text style={styles.budgetAmounts}>
        {formatCurrencyShort(spent)} of {formatCurrencyShort(limit).replace(/^[^\s]+\s/, '')}
      </Text>
    </View>
  );
}

/* Mini sparkline — zigzag bars whose heights map to daily spend */
function Sparkline({ values, color = colors.accent[500], height = 44, width = 120 }) {
  if (!values || values.length === 0) {
    return <View style={{ width, height }} />;
  }
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  const barWidth = Math.max(2, (width - (values.length - 1) * 2) / values.length);

  return (
    <View style={[styles.sparkWrap, { width, height, backgroundColor: color + '15' }]}>
      <View style={styles.sparkBars}>
        {values.map((v, i) => {
          const h = Math.max(2, ((v - min) / range) * (height - 6));
          return (
            <View
              key={i}
              style={{
                width: barWidth,
                height: h,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/* Daily spend card */
function DailySpendCard({ daily, totalExpenses, days }) {
  const avgPerDay = days > 0 ? Number(totalExpenses) / days : 0;
  const sparkValues = daily && daily.length > 0 ? daily : [];

  return (
    <View style={styles.dailyCard}>
      <View style={styles.dailyCardLeft}>
        <Text style={styles.dailyLabel}>DAILY SPEND · {days}D</Text>
        <View style={styles.dailyAmountRow}>
          <Text style={styles.dailyAmount}>{formatCurrency(avgPerDay).replace(/\.\d+$/, '')}</Text>
          <Text style={styles.dailySubLabel}>avg / day</Text>
        </View>
      </View>
      <Sparkline values={sparkValues} />
    </View>
  );
}

/* Quick action button — full-bg card, icon centred, label below */
function QuickAction({ icon, label, color, bg, dark, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: dark ? colors.primary[900] : bg }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <MaterialIcons name={icon} size={24} color={dark ? colors.white : color} />
      <Text
        style={[styles.quickActionLabel, { color: dark ? colors.white : colors.primary[700] }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* Recent transaction row */
function TransactionRow({ item, navigation, isLast }) {
  const isIncome = item._type === 'income';
  const iconBg = item.category_color
    ? item.category_color + '20'
    : isIncome ? colors.accent[50] : colors.primary[100];
  const iconColor = item.category_color || (isIncome ? colors.accent[600] : colors.primary[600]);
  const iconName = isIncome
    ? mapCategoryIcon(item.category_name || 'Salary')
    : mapCategoryIcon(item.category_name);

  return (
    <TouchableOpacity
      style={[styles.transactionItem, isLast && styles.transactionItemLast]}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
          screen: SCREEN_NAMES.TRANSACTION_DETAIL,
          params: { id: item.id, type: isIncome ? 'income' : 'expense' },
        })
      }
    >
      <View style={[styles.transactionIcon, { backgroundColor: iconBg }]}>
        <MaterialIcons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc} numberOfLines={1}>
          {item.description || item.merchant || item.source || (isIncome ? 'Income' : 'Expense')}
        </Text>
        <Text style={styles.transactionMeta}>
          {item.category_name || (isIncome ? 'Income' : 'Expense')} · {formatDate(item.date)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: isIncome ? colors.accent[600] : colors.danger[500] }]}>
        {isIncome ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
      </Text>
    </TouchableOpacity>
  );
}

/* MAIN SCREEN */
export function HomeScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(false);
  const [budgetCards, setBudgetCards] = useState([]);
  const [recentIncomes, setRecentIncomes] = useState([]);
  const [dailySeries, setDailySeries] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const data = await dashboardService.getDashboard();
      setDashboard(data);

      // Side fetches — recent incomes, category budgets, daily spend series, monthly budget
      const [incomesRes, catRes, budgets, period, mb] = await Promise.all([
        dashboardService.getRecentIncomes(5).catch(() => ({ results: [] })),
        txnService.getCategories('expense').catch(() => ({ results: [] })),
        storage.getCategoryBudgets().catch(() => ({})),
        getCurrentBudgetPeriod().catch(() => null),
        storage.getMonthlyBudget().catch(() => null),
      ]);
      setRecentIncomes(incomesRes.results || incomesRes || []);
      setMonthlyBudget(mb);

      // Build budget carousel from CategoryBudgets + cycle expenses
      const allCats = catRes.results || catRes || [];
      const catById = {};
      allCats.forEach((c) => { catById[c.id] = c; });
      const budgetedIds = Object.keys(budgets).filter((id) => Number(budgets[id]) > 0);

      if (period && budgetedIds.length > 0) {
        const expRes = await txnService.getExpenses({
          date_after: toApiDate(period.start),
          date_before: toApiDate(period.end),
          page_size: 500,
        }).catch(() => ({ results: [] }));
        const expenses = expRes.results || expRes || [];
        const sums = {};
        expenses.forEach((e) => {
          // category is a nested object {id, name, ...} from the API
          const cid = (e.category && typeof e.category === 'object')
            ? e.category.id
            : (e.category_id ?? e.category);
          if (cid != null) sums[cid] = (sums[cid] || 0) + Number(e.amount || 0);
        });
        const cards = budgetedIds.map((id) => {
          const cat = catById[id] || {};
          return {
            id,
            name: cat.name || 'Category',
            color: cat.color,
            limit: Number(budgets[id]) || 0,
            spent: sums[id] || 0,
          };
        }).sort((a, b) => (b.spent / (b.limit || 1)) - (a.spent / (a.limit || 1)));
        setBudgetCards(cards);
      } else {
        setBudgetCards([]);
      }

      // Build last-14-day daily expense series for the sparkline
      const now = new Date();
      const fourteenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      const dailyRes = await txnService.getExpenses({
        date_after: toApiDate(fourteenAgo),
        date_before: toApiDate(now),
        page_size: 500,
      }).catch(() => ({ results: [] }));
      const dailyExpenses = dailyRes.results || dailyRes || [];
      const buckets = Array(14).fill(0);
      dailyExpenses.forEach((e) => {
        if (!e.date) return;
        const d = new Date(e.date);
        const diff = Math.floor((d - fourteenAgo) / 86400000);
        if (diff >= 0 && diff < 14) buckets[diff] += Number(e.amount || 0);
      });
      setDailySeries(buckets);
    } catch (err) {
      setError(true);
      if (isRefresh) showToast('Failed to refresh dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => fetchDashboard(true);
  const firstName = user?.first_name || user?.username || 'there';

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading dashboard..." />
      </SafeAreaView>
    );
  }

  if (error && !dashboard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="cloud-off"
          title="Couldn't load dashboard"
          description="Check your connection and make sure the backend server is running."
          actionTitle="Try Again"
          onAction={() => fetchDashboard()}
        />
      </SafeAreaView>
    );
  }

  const d = dashboard || {};
  const recentExpenses = (d.recent_expenses || []).map((e) => ({ ...e, _type: 'expense' }));
  const recentIncs = (recentIncomes || []).map((i) => ({ ...i, _type: 'income' }));

  // Merge expenses + incomes, sort by date desc, cap at 6
  const recentItems = [...recentExpenses, ...recentIncs]
    .sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    })
    .slice(0, 6);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent[600]]}
            tintColor={colors.accent[600]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() =>
              navigation.navigate(SCREEN_NAMES.HOME_TAB, {
                screen: SCREEN_NAMES.NOTIFICATION_LIST,
              })
            }
          >
            <MaterialIcons name="notifications-none" size={24} color={colors.white} />
            {d.unread_notifications > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {d.unread_notifications > 9 ? '9+' : d.unread_notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Remaining This Month */}
        <RemainingCard
          income={d.total_income_this_month}
          expenses={d.total_expenses_this_month}
          savingsRate={d.savings_rate}
          monthlyBudget={monthlyBudget}
        />

        {/* Budget Carousel */}
        <View style={styles.carouselSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Budgets</Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS_TAB, { screen: SCREEN_NAMES.CATEGORY_BUDGETS })}>
              <Text style={styles.manageLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          {budgetCards.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.budgetCarousel}
              decelerationRate="fast"
            >
              {budgetCards.map((cat) => (
                <BudgetCard key={cat.id} cat={cat} />
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={styles.budgetEmpty}
              onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS_TAB, { screen: SCREEN_NAMES.CATEGORY_BUDGETS })}
              activeOpacity={0.7}
            >
              <MaterialIcons name="pie-chart-outline" size={20} color={colors.primary[400]} />
              <Text style={styles.budgetEmptyText}>Set category budgets to see them here</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <QuickAction
              icon="photo-camera"
              label="Scan"
              color={colors.primary[700]}
              bg={colors.primary[900]}
              dark
              onPress={() => navigation.navigate(SCREEN_NAMES.SCAN_TAB)}
            />
            <QuickAction
              icon="add-circle-outline"
              label="Log Expense"
              color={colors.primary[700]}
              bg={colors.primary[100]}
              onPress={() =>
                navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
                  screen: SCREEN_NAMES.ADD_EXPENSE,
                })
              }
            />
            <QuickAction
              icon="auto-awesome"
              label="Ask AI"
              color={colors.accent[700]}
              bg={colors.accent[100]}
              onPress={() => navigation.navigate(SCREEN_NAMES.CHAT_TAB)}
            />
          </View>
        </View>

        {/* Daily Spend Card */}
        <DailySpendCard
          daily={dailySeries}
          totalExpenses={dailySeries.reduce((s, v) => s + v, 0)}
          days={dailySeries.length || 14}
        />

        {/* Recent */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB)}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.section}>
            {recentItems.length > 0 ? (
              recentItems.map((item, idx) => (
                <TransactionRow
                  key={`${item._type}-${item.id}`}
                  item={item}
                  navigation={navigation}
                  isLast={idx === recentItems.length - 1}
                />
              ))
            ) : (
              <View style={styles.emptyTransactions}>
                <MaterialIcons name="receipt-long" size={32} color={colors.primary[300]} />
                <Text style={styles.emptyText}>No transactions yet</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
                      screen: SCREEN_NAMES.ADD_EXPENSE,
                    })
                  }
                >
                  <Text style={styles.emptyAction}>Add your first transaction</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.bodySmall,
    color: colors.primary[500],
  },
  userName: {
    ...typography.h1,
    fontSize: 28,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[900],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.danger[500],
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },

  /* Section shared */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.primary[800],
  },
  manageLink: {
    ...typography.bodySmall,
    color: colors.primary[800],
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  viewAll: {
    ...typography.bodySmall,
    color: colors.primary[800],
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  /* Remaining This Month card */
  remainingCard: {
    marginHorizontal: H_PAD,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.md,
  },
  remainingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  remainingLeft: {
    flex: 1,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  remainingAmount: {
    ...typography.h1,
    fontSize: 30,
    color: colors.primary[900],
  },
  remainingTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  remainingTrendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  savingsCircleWrap: {
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: colors.accent[400],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent[50],
  },
  savingsPct: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent[700],
  },
  savingsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent[500],
    letterSpacing: 0.4,
  },
  remainingDivider: {
    height: 1,
    backgroundColor: colors.primary[100],
    marginVertical: spacing.sm,
  },
  remainingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  remainingStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  remainingStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary[500],
  },
  remainingStatValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary[800],
  },
  remainingStatSep: {
    width: 1,
    height: 28,
    backgroundColor: colors.primary[100],
    marginHorizontal: spacing.sm,
  },
  pacingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  pacingLabel: {
    fontSize: 11,
    color: colors.primary[500],
    fontWeight: '500',
  },
  pacingPct: {
    fontSize: 11,
    color: colors.primary[500],
    fontWeight: '700',
  },
  pacingBarBg: {
    height: 5,
    backgroundColor: colors.primary[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  pacingBarFill: {
    height: 5,
    borderRadius: 3,
  },

  /* Budget carousel */
  carouselSection: {
    marginBottom: spacing.lg,
    paddingHorizontal: H_PAD,
  },
  budgetCarousel: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  budgetCard: {
    width: 140,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
    gap: spacing.sm,
  },
  budgetCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  budgetCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[800],
    flex: 1,
  },
  budgetPctText: {
    fontSize: 14,
    fontWeight: '700',
  },
  budgetBarBg: {
    height: 4,
    backgroundColor: colors.primary[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: 4,
    borderRadius: 3,
  },
  budgetAmounts: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '500',
  },
  budgetEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderStyle: 'dashed',
  },
  budgetEmptyText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '500',
  },

  /* Quick Actions */
  quickActionsSection: {
    paddingHorizontal: H_PAD,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadow.sm,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Daily Spend */
  dailyCard: {
    marginHorizontal: H_PAD,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  dailyCardLeft: {
    flex: 1,
  },
  dailyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  dailyAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  dailyAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[900],
  },
  dailySubLabel: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '500',
  },

  /* Sparkline */
  sparkWrap: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  sparkBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  /* Recent section */
  recentSection: {
    marginHorizontal: H_PAD,
    marginBottom: spacing.md,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  transactionItemLast: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  transactionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  transactionDesc: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary[800],
    fontWeight: '600',
  },
  transactionMeta: {
    ...typography.caption,
    color: colors.primary[500],
    fontWeight: '500',
    marginTop: 2,
  },
  transactionAmount: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },

  /* Empty */
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.primary[400],
    marginTop: spacing.sm,
  },
  emptyAction: {
    ...typography.bodySmall,
    color: colors.accent[600],
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  aiAskBtnText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});

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
import { formatCurrency, formatDate, formatPercent } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import * as dashboardService from '../../services/dashboard';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

export function HomeScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const data = await dashboardService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(true);
      if (isRefresh) {
        showToast('Failed to refresh dashboard', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Fetch on screen focus
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent[600]]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate(SCREEN_NAMES.HOME_TAB, {
              screen: SCREEN_NAMES.NOTIFICATION_LIST,
            })}
          >
            <MaterialIcons name="notifications-none" size={24} color={colors.primary[700]} />
            {d.unread_notifications > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {d.unread_notifications > 9 ? '9+' : d.unread_notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Alert Banners */}
        {d.budgets_at_risk > 0 && (
          <TouchableOpacity style={styles.alertBanner}>
            <MaterialIcons name="warning-amber" size={20} color={colors.warning[600]} />
            <Text style={styles.alertText}>
              {d.budgets_at_risk} budget{d.budgets_at_risk > 1 ? 's' : ''} at risk this month
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.warning[600]} />
          </TouchableOpacity>
        )}

        {d.unread_insights > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, styles.insightBanner]}
            onPress={() => navigation.navigate(SCREEN_NAMES.CHAT_TAB)}
          >
            <MaterialIcons name="auto-awesome" size={20} color={colors.info[500]} />
            <Text style={[styles.alertText, { color: colors.info[500] }]}>
              {d.unread_insights} new AI insight{d.unread_insights > 1 ? 's' : ''} available
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.info[500]} />
          </TouchableOpacity>
        )}

        {/* Summary Cards — 2×2 grid */}
        <View style={styles.cardGrid}>
          <SummaryCard
            icon="account-balance-wallet"
            iconBg={colors.primary[100]}
            iconColor={colors.primary[700]}
            label="Balance"
            value={formatCurrency(d.total_balance)}
            subtitle={`${d.active_budgets || 0} active budgets`}
          />
          <SummaryCard
            icon="arrow-downward"
            iconBg={colors.accent[50]}
            iconColor={colors.accent[600]}
            label="Income"
            value={formatCurrency(d.total_income_this_month)}
            subtitle="This month"
            valueColor={colors.accent[600]}
          />
          <SummaryCard
            icon="arrow-upward"
            iconBg={colors.danger[50]}
            iconColor={colors.danger[500]}
            label="Expenses"
            value={formatCurrency(d.total_expenses_this_month)}
            subtitle="This month"
            valueColor={colors.danger[500]}
          />
          <SummaryCard
            icon="trending-up"
            iconBg={colors.accent[50]}
            iconColor={colors.accent[600]}
            label="Savings"
            value={formatPercent(d.savings_rate)}
            subtitle="Savings rate"
            valueColor={Number(d.savings_rate) >= 0 ? colors.accent[600] : colors.danger[500]}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <QuickAction
              icon="remove-circle-outline"
              label="Add Expense"
              color={colors.danger[500]}
              bg={colors.danger[50]}
              onPress={() => navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
                screen: SCREEN_NAMES.ADD_EXPENSE,
              })}
            />
            <QuickAction
              icon="add-circle-outline"
              label="Add Income"
              color={colors.accent[600]}
              bg={colors.accent[50]}
              onPress={() => navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
                screen: SCREEN_NAMES.ADD_INCOME,
              })}
            />
            <QuickAction
              icon="photo-camera"
              label="Scan Receipt"
              color={colors.primary[700]}
              bg={colors.primary[100]}
              onPress={() => navigation.navigate(SCREEN_NAMES.SCAN_TAB)}
            />
            <QuickAction
              icon="chat-bubble-outline"
              label="AI Chat"
              color={colors.info[500]}
              bg={colors.info[50]}
              onPress={() => navigation.navigate(SCREEN_NAMES.CHAT_TAB)}
            />
          </View>
        </View>

        {/* Top Spending Categories */}
        {d.top_categories && d.top_categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Categories</Text>
              <Text style={styles.sectionSubtitle}>This month</Text>
            </View>
            {d.top_categories.slice(0, 5).map((cat, index) => {
              const maxTotal = Number(d.top_categories[0]?.total) || 1;
              const percent = (Number(cat.total) / maxTotal) * 100;
              return (
                <View key={cat.name + index} style={styles.categoryRow}>
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                  <Text style={styles.categoryAmount}>{formatCurrency(cat.total)}</Text>
                  <View style={styles.categoryBarBg}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        { width: `${Math.min(percent, 100)}%`, backgroundColor: cat.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB)}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {d.recent_expenses && d.recent_expenses.length > 0 ? (
            d.recent_expenses.slice(0, 5).map((expense) => (
              <TouchableOpacity
                key={expense.id}
                style={styles.transactionItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
                  screen: SCREEN_NAMES.TRANSACTION_DETAIL,
                  params: { id: expense.id, type: 'expense' },
                })}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: expense.category_color ? expense.category_color + '20' : colors.primary[100] },
                  ]}
                >
                  <MaterialIcons
                    name={mapCategoryIcon(expense.category_name)}
                    size={20}
                    color={expense.category_color || colors.primary[600]}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc} numberOfLines={1}>
                    {expense.description || expense.merchant || 'Expense'}
                  </Text>
                  <Text style={styles.transactionMeta}>
                    {expense.category_name} · {formatDate(expense.date)}
                  </Text>
                </View>
                <Text style={styles.transactionAmount}>
                  -{formatCurrency(expense.amount, expense.currency)}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyTransactions}>
              <MaterialIcons name="receipt-long" size={32} color={colors.primary[300]} />
              <Text style={styles.emptyText}>No expenses yet this month</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
                  screen: SCREEN_NAMES.ADD_EXPENSE,
                })}
              >
                <Text style={styles.emptyAction}>Add your first expense</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Sub-components ─── */

function SummaryCard({ icon, iconBg, iconColor, label, value, subtitle, valueColor }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor && { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summarySubtitle}>{subtitle}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, bg, onPress }) {
  return (
    <TouchableOpacity style={styles.quickActionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Map category name to MaterialIcons icon name.
 */
function mapCategoryIcon(categoryName) {
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
  return map[categoryName] || 'more-horiz';
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.body,
    color: colors.primary[500],
  },
  userName: {
    ...typography.h1,
    fontSize: 24,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
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

  // Alert banners
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  insightBanner: {
    backgroundColor: colors.info[50],
  },
  alertText: {
    ...typography.bodySmall,
    color: colors.warning[600],
    flex: 1,
    fontWeight: '500',
  },

  // Summary cards grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.primary[500],
    marginBottom: 2,
  },
  summaryValue: {
    ...typography.h3,
    fontSize: 17,
    marginBottom: 2,
  },
  summarySubtitle: {
    ...typography.caption,
    color: colors.primary[400],
  },

  // Quick Actions
  quickActions: {
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  quickActionItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 3) / 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.primary[600],
    textAlign: 'center',
    fontWeight: '500',
  },

  // Sections
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.primary[400],
  },
  viewAll: {
    ...typography.bodySmall,
    color: colors.accent[600],
    fontWeight: '600',
  },

  // Top Categories
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  categoryName: {
    ...typography.bodySmall,
    color: colors.primary[700],
    flex: 1,
    fontWeight: '500',
  },
  categoryAmount: {
    ...typography.bodySmall,
    color: colors.primary[800],
    fontWeight: '600',
    marginRight: spacing.sm,
    minWidth: 80,
    textAlign: 'right',
  },
  categoryBarBg: {
    width: 60,
    height: 6,
    backgroundColor: colors.primary[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Transactions
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
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
    fontWeight: '500',
  },
  transactionMeta: {
    ...typography.caption,
    color: colors.primary[400],
    marginTop: 2,
  },
  transactionAmount: {
    ...typography.body,
    fontSize: 14,
    color: colors.danger[500],
    fontWeight: '600',
  },

  // Empty state
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
});

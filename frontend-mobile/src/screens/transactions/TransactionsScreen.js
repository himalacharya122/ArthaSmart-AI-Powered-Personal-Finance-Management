import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { SCREEN_NAMES, CATEGORY_ICONS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const TABS = ['Expenses', 'Income'];

export function TransactionsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState(0); // 0 = Expenses, 1 = Income
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expensePage, setExpensePage] = useState(1);
  const [incomePage, setIncomePage] = useState(1);
  const [expenseHasMore, setExpenseHasMore] = useState(true);
  const [incomeHasMore, setIncomeHasMore] = useState(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [expRes, incRes] = await Promise.all([
        txnService.getExpenses({ ordering: '-date', page: 1, page_size: 15 }),
        txnService.getIncomes({ ordering: '-date', page: 1, page_size: 15 }),
      ]);

      setExpenses(expRes.results || []);
      setIncomes(incRes.results || []);
      setExpensePage(1);
      setIncomePage(1);
      setExpenseHasMore(!!expRes.next);
      setIncomeHasMore(!!incRes.next);
    } catch (err) {
      if (!isRefresh) showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const loadMore = async () => {
    if (loadingMore) return;

    if (activeTab === 0 && expenseHasMore) {
      setLoadingMore(true);
      try {
        const nextPage = expensePage + 1;
        const res = await txnService.getExpenses({ ordering: '-date', page: nextPage, page_size: 15 });
        setExpenses((prev) => [...prev, ...(res.results || [])]);
        setExpensePage(nextPage);
        setExpenseHasMore(!!res.next);
      } catch { /* ignore */ }
      setLoadingMore(false);
    } else if (activeTab === 1 && incomeHasMore) {
      setLoadingMore(true);
      try {
        const nextPage = incomePage + 1;
        const res = await txnService.getIncomes({ ordering: '-date', page: nextPage, page_size: 15 });
        setIncomes((prev) => [...prev, ...(res.results || [])]);
        setIncomePage(nextPage);
        setIncomeHasMore(!!res.next);
      } catch { /* ignore */ }
      setLoadingMore(false);
    }
  };

  const data = activeTab === 0 ? expenses : incomes;
  const hasMore = activeTab === 0 ? expenseHasMore : incomeHasMore;

  const handleDelete = async (id) => {
    try {
      if (activeTab === 0) {
        await txnService.deleteExpense(id);
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } else {
        await txnService.deleteIncome(id);
        setIncomes((prev) => prev.filter((i) => i.id !== id));
      }
      showToast('Transaction deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const renderItem = ({ item }) => {
    const isExpense = activeTab === 0;
    const catName = item.category?.name || 'Other';
    const catColor = item.category?.color || colors.primary[400];
    const iconName = CATEGORY_ICONS[catName] || 'more-horiz';
    const label = isExpense
      ? item.description || item.merchant || 'Expense'
      : item.source_name || item.description || 'Income';

    return (
      <TouchableOpacity
        style={styles.txnItem}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate(SCREEN_NAMES.TRANSACTIONS_TAB, {
            screen: SCREEN_NAMES.TRANSACTION_DETAIL,
            params: { id: item.id, type: isExpense ? 'expense' : 'income' },
          })
        }
      >
        <View style={[styles.txnIcon, { backgroundColor: catColor + '20' }]}>
          <MaterialIcons name={iconName} size={20} color={catColor} />
        </View>

        <View style={styles.txnInfo}>
          <Text style={styles.txnLabel} numberOfLines={1}>{label}</Text>
          <Text style={styles.txnMeta}>{catName} · {formatDate(item.date)}</Text>
        </View>

        <Text
          style={[
            styles.txnAmount,
            { color: isExpense ? colors.danger[500] : colors.accent[600] },
          ]}
        >
          {isExpense ? '-' : '+'}{formatCurrency(item.amount, item.currency)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.accent[500]} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading transactions..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === idx && styles.tabActive]}
            onPress={() => setActiveTab(idx)}
          >
            <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      {data.length === 0 ? (
        <EmptyState
          icon={activeTab === 0 ? 'receipt-long' : 'account-balance-wallet'}
          title={activeTab === 0 ? 'No expenses yet' : 'No income yet'}
          description={
            activeTab === 0
              ? 'Start tracking your spending by adding your first expense.'
              : 'Record your income sources to track your earnings.'
          }
          actionTitle={activeTab === 0 ? 'Add Expense' : 'Add Income'}
          onAction={() =>
            navigation.navigate(
              activeTab === 0 ? SCREEN_NAMES.ADD_EXPENSE : SCREEN_NAMES.ADD_INCOME
            )
          }
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={[colors.accent[600]]}
            />
          }
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate(
            activeTab === 0 ? SCREEN_NAMES.ADD_EXPENSE : SCREEN_NAMES.ADD_INCOME
          )
        }
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 24,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.white,
    ...shadow.sm,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.primary[500],
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary[800],
  },

  // List
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  txnIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  txnInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txnLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary[800],
    fontWeight: '500',
  },
  txnMeta: {
    ...typography.caption,
    color: colors.primary[400],
    marginTop: 2,
  },
  txnAmount: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent[600],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
});

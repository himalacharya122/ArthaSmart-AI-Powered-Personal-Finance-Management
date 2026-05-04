import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { format as fmtDate } from 'date-fns';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { SCREEN_NAMES, CATEGORY_ICONS } from '../../utils/constants';
import { formatCurrency, formatCurrencyCompact, formatSectionDate } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BottomSheet } from '../../components/common/BottomSheet';

const TABS = ['All', 'Expenses', 'Income'];

// Manrope variants — applied directly so this screen matches the rest of the
// app (typography.* helpers carry fontFamily, but our custom inline styles
// here use raw fontSize/fontWeight which RN doesn't auto-resolve to Manrope).
const F = {
  semi: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  xbold: 'Manrope-ExtraBold',
};

function groupByDate(items) {
  const map = {};
  items.forEach((item) => {
    const key = formatSectionDate(item.date);
    if (!map[key]) map[key] = { title: key, data: [], rawDate: item.date };
    map[key].data.push(item);
  });
  return Object.values(map);
}

function timeFromIso(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return fmtDate(d, 'h:mm a');
  } catch {
    return null;
  }
}

export function TransactionsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);

  // 0 = All, 1 = Expenses, 2 = Income
  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination per type
  const [expensePage, setExpensePage] = useState(1);
  const [incomePage, setIncomePage] = useState(1);
  const [expenseHasMore, setExpenseHasMore] = useState(true);
  const [incomeHasMore, setIncomeHasMore] = useState(true);

  // Cycle totals (header pills)
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [expRes, incRes, expSummary, incSummary, catRes] = await Promise.all([
        txnService.getExpenses({ ordering: '-date', page: 1, page_size: 30 }),
        txnService.getIncomes({ ordering: '-date', page: 1, page_size: 30 }),
        txnService.getExpenseSummary().catch(() => ({ total: '0' })),
        txnService.getIncomeSummary().catch(() => ({ total: '0' })),
        txnService.getCategories().catch(() => ({ results: [] })),
      ]);

      setExpenses(expRes.results || []);
      setIncomes(incRes.results || []);
      setExpenseTotal(Number(expSummary.total || 0));
      setIncomeTotal(Number(incSummary.total || 0));
      setCategories(catRes.results || []);
      setExpensePage(1);
      setIncomePage(1);
      setExpenseHasMore(!!expRes.next);
      setIncomeHasMore(!!incRes.next);
    } catch {
      if (!isRefresh) showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const loadMore = async () => {
    if (loadingMore) return;
    if (activeTab === 0) {
      // All tab — load more from whichever side has more left
      if (expenseHasMore) {
        setLoadingMore(true);
        try {
          const next = expensePage + 1;
          const res = await txnService.getExpenses({ ordering: '-date', page: next, page_size: 30 });
          setExpenses((p) => [...p, ...(res.results || [])]);
          setExpensePage(next);
          setExpenseHasMore(!!res.next);
        } catch { /* ignore */ }
        setLoadingMore(false);
      } else if (incomeHasMore) {
        setLoadingMore(true);
        try {
          const next = incomePage + 1;
          const res = await txnService.getIncomes({ ordering: '-date', page: next, page_size: 30 });
          setIncomes((p) => [...p, ...(res.results || [])]);
          setIncomePage(next);
          setIncomeHasMore(!!res.next);
        } catch { /* ignore */ }
        setLoadingMore(false);
      }
    } else if (activeTab === 1 && expenseHasMore) {
      setLoadingMore(true);
      try {
        const next = expensePage + 1;
        const res = await txnService.getExpenses({ ordering: '-date', page: next, page_size: 30 });
        setExpenses((p) => [...p, ...(res.results || [])]);
        setExpensePage(next);
        setExpenseHasMore(!!res.next);
      } catch { /* ignore */ }
      setLoadingMore(false);
    } else if (activeTab === 2 && incomeHasMore) {
      setLoadingMore(true);
      try {
        const next = incomePage + 1;
        const res = await txnService.getIncomes({ ordering: '-date', page: next, page_size: 30 });
        setIncomes((p) => [...p, ...(res.results || [])]);
        setIncomePage(next);
        setIncomeHasMore(!!res.next);
      } catch { /* ignore */ }
      setLoadingMore(false);
    }
  };

  // ─── Filtered + sectioned data ───────────────────────────────────────────
  const merged = useMemo(() => {
    if (activeTab === 0) {
      const tagged = [
        ...expenses.map((e) => ({ ...e, _kind: 'expense' })),
        ...incomes.map((i) => ({ ...i, _kind: 'income' })),
      ];
      return tagged.sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return db - da;
      });
    }
    if (activeTab === 1) return expenses.map((e) => ({ ...e, _kind: 'expense' }));
    return incomes.map((i) => ({ ...i, _kind: 'income' }));
  }, [activeTab, expenses, incomes]);

  const filteredData = useMemo(() => {
    let list = merged;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const haystack = [t.description, t.merchant, t.source_name, t.notes, t.category?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (selectedCatId) {
      list = list.filter((t) => t.category?.id === selectedCatId);
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      let endDate = null;
      
      if (dateFilter === '7days') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === 'thisMonth') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateFilter === 'lastMonth') {
        cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }
      
      list = list.filter((t) => {
        const tDate = new Date(t.date || t.created_at);
        if (endDate) {
          return tDate >= cutoff && tDate <= endDate;
        }
        return tDate >= cutoff;
      });
    }
    return list;
  }, [merged, searchQuery, selectedCatId, dateFilter]);

  const sections = useMemo(() => groupByDate(filteredData), [filteredData]);

  // Categories shown as chips: depend on tab and existing transactions' categories
  const tabCategories = useMemo(() => {
    if (activeTab === 1) return categories.filter((c) => c.type === 'expense');
    if (activeTab === 2) return categories.filter((c) => c.type === 'income');
    return categories;
  }, [categories, activeTab]);

  const hasMore =
    activeTab === 0 ? (expenseHasMore || incomeHasMore) :
    activeTab === 1 ? expenseHasMore : incomeHasMore;

  const balance = incomeTotal - expenseTotal;

  // Tap export icon → push the existing Export Data screen on the current
  // stack so "back" returns to Transactions, not Home or Settings.
  // (The screen is registered on both TransactionsStack and SettingsStack.)
  const goToExport = () => {
    navigation.navigate(SCREEN_NAMES.EXPORT_DATA);
  };

  // ─── Renderers ───────────────────────────────────────────────────────────

  const renderSectionHeader = ({ section }) => {
    // Section total: sum of expenses (negative) when on All/Expenses tab,
    // sum of incomes (positive) on Income tab. Matches what users care about
    // ("how much did I spend today?").
    let total = 0;
    let sign = '-';
    let color = colors.danger[500];
    if (activeTab === 2) {
      total = section.data.reduce((s, t) => s + Number(t.amount || 0), 0);
      sign = '+';
      color = colors.accent[600];
    } else {
      total = section.data
        .filter((t) => t._kind !== 'income')
        .reduce((s, t) => s + Number(t.amount || 0), 0);
    }
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    );
  };

  const renderItem = ({ item, index, section }) => {
    const isExpense = item._kind !== 'income';
    const catName = item.category?.name || (isExpense ? 'Other' : 'Income');
    const catColor = item.category?.color || colors.primary[400];
    const iconName = CATEGORY_ICONS[catName] || (isExpense ? 'shopping-bag' : 'account-balance-wallet');

    // Title preference: merchant > description > source > category
    const title = isExpense
      ? (item.merchant || item.description || catName)
      : (item.source_name || item.description || catName);

    const time = timeFromIso(item.created_at);
    const meta = time ? `${catName} · ${time}` : catName;

    const isFirst = index === 0;
    const isLast = index === section.data.length - 1;

    const openDetail = () =>
      navigation.navigate(SCREEN_NAMES.TRANSACTION_DETAIL, {
        id: item.id,
        type: isExpense ? 'expense' : 'income',
      });

    return (
      <View
        style={[
          styles.txnWrap,
          isFirst && styles.txnWrapFirst,
          isLast && styles.txnWrapLast,
        ]}
      >
        <TouchableOpacity style={styles.txnItem} activeOpacity={0.7} onPress={openDetail}>
          <View style={[styles.txnIcon, { backgroundColor: catColor + '22' }]}>
            <MaterialIcons name={iconName} size={20} color={catColor} />
          </View>
          <View style={styles.txnInfo}>
            <Text style={styles.txnLabel} numberOfLines={1}>{title}</Text>
            <Text style={styles.txnMeta} numberOfLines={1}>{meta}</Text>
          </View>
          <Text
            style={[
              styles.txnAmount,
              { color: isExpense ? colors.danger[500] : colors.accent[600] },
            ]}
          >
            {isExpense ? '- ' : '+ '}{formatCurrency(item.amount, item.currency)}
          </Text>
        </TouchableOpacity>
        {!isLast && <View style={styles.txnDivider} />}
      </View>
    );
  };

  const renderFooter = () => loadingMore ? (
    <View style={styles.listFooter}>
      <ActivityIndicator size="small" color={colors.accent[500]} />
    </View>
  ) : null;

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
        <Text style={styles.bigTitle}>Transactions</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => { setShowSearch((v) => !v); if (showSearch) setSearchQuery(''); }}
            style={[styles.iconBtn, showSearch && styles.iconBtnActive]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={showSearch ? colors.white : colors.primary[700]}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={[styles.iconBtn, (selectedCatId || dateFilter !== 'all') && styles.iconBtnActiveFilter]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="tune"
              size={20}
              color={(selectedCatId || dateFilter !== 'all') ? colors.white : colors.primary[700]}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToExport} style={styles.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="file-download" size={20} color={colors.primary[700]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      {showSearch && (
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color={colors.primary[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant, category, notes..."
            placeholderTextColor={colors.primary[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
              <MaterialIcons name="close" size={18} color={colors.primary[400]} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary pills */}
      <View style={styles.summaryRow}>
        <SummaryPill
          dotColor={colors.danger[500]}
          label="EXPENSES"
          amount={formatCurrencyCompact(expenseTotal)}
          color={colors.danger[500]}
        />
        <SummaryPill
          dotColor={colors.accent[500]}
          label="INCOME"
          amount={formatCurrencyCompact(incomeTotal)}
          color={colors.accent[600]}
        />
        <SummaryPill
          dotColor={balance >= 0 ? colors.accent[500] : colors.danger[500]}
          label="REMAINING"
          amount={`${balance >= 0 ? '+ ' : '- '}${formatCurrencyCompact(Math.abs(balance))}`}
          color={balance >= 0 ? colors.accent[600] : colors.danger[500]}
        />
      </View>

      {/* Tab segmented */}
      <View style={styles.segmentTrack}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.segmentTab, activeTab === idx && styles.segmentTabActive]}
            onPress={() => { setActiveTab(idx); setSelectedCatId(null); setDateFilter('all'); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeTab === idx && styles.segmentTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>



      {/* List */}
      {filteredData.length === 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.emptyWrap}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent[600]]} />}
        >
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBg}>
              <MaterialIcons name="receipt-long" size={28} color={colors.primary[400]} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedCatId || dateFilter !== 'all' ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={styles.emptyDesc}>
              {searchQuery || selectedCatId || dateFilter !== 'all'
                ? 'Try a different search or clear your filters.'
                : 'Log your first expense or scan a receipt to get started.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => {
                if (searchQuery || selectedCatId || dateFilter !== 'all') {
                  setSearchQuery('');
                  setSelectedCatId(null);
                  setDateFilter('all');
                  return;
                }
                navigation.navigate(
                  activeTab === 2 ? SCREEN_NAMES.ADD_INCOME : SCREEN_NAMES.ADD_EXPENSE
                );
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={searchQuery || selectedCatId || dateFilter !== 'all' ? 'clear' : 'add'}
                size={18}
                color={colors.white}
              />
              <Text style={styles.emptyCtaText}>
                {searchQuery || selectedCatId || dateFilter !== 'all'
                  ? 'Clear filters'
                  : activeTab === 2 ? 'Log first income' : 'Log first expense'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item._kind}-${item.id}`}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent[600]]} />
          }
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Floating quick-add */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate(activeTab === 2 ? SCREEN_NAMES.ADD_INCOME : SCREEN_NAMES.ADD_EXPENSE)
        }
      >
        <MaterialIcons name="add" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* Filter Modal */}
      <BottomSheet visible={showFilters} onClose={() => setShowFilters(false)}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {(selectedCatId || dateFilter !== 'all') && (
                <TouchableOpacity onPress={() => { setSelectedCatId(null); setDateFilter('all'); }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 14, color: colors.danger[600] }}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <MaterialIcons name="close" size={24} color={colors.primary[500]} />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {/* Date Range */}
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            <View style={styles.filterOptionsGrid}>
              {[
                { id: 'all', label: 'All Time' },
                { id: '7days', label: 'Last 7 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'lastMonth', label: 'Last Month' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.filterOpt, dateFilter === opt.id && styles.filterOptActive]}
                  onPress={() => setDateFilter(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterOptText, dateFilter === opt.id && styles.filterOptTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={[styles.filterSectionTitle, { marginTop: spacing.lg }]}>Category</Text>
            <View style={styles.filterOptionsGrid}>
              <TouchableOpacity
                style={[styles.filterOpt, !selectedCatId && styles.filterOptActive]}
                onPress={() => setSelectedCatId(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterOptText, !selectedCatId && styles.filterOptTextActive]}>All</Text>
              </TouchableOpacity>
              {tabCategories.map((cat) => {
                const selected = selectedCatId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.filterOpt, selected && styles.filterOptActive]}
                    onPress={() => setSelectedCatId(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterOptText, selected && styles.filterOptTextActive]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: spacing.xl }} />
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.sheetApplyBtn}
              onPress={() => setShowFilters(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetApplyText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function SummaryPill({ dotColor, label, amount, color }) {
  return (
    <View style={styles.summaryPill}>
      <View style={styles.summaryTopRow}>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={[styles.summaryAmount, { color }]} numberOfLines={1}>
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bigTitle: { fontFamily: F.xbold, fontSize: 26, color: colors.primary[900], letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.primary[100],
  },
  iconBtnActive: { backgroundColor: colors.primary[900], borderColor: colors.primary[900] },
  iconBtnActiveFilter: { backgroundColor: colors.primary[900], borderColor: colors.primary[900] },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    height: 42,
    borderWidth: 1, borderColor: colors.primary[600],
  },
  searchInput: { flex: 1, fontFamily: F.semi, fontSize: 14, color: colors.primary[800], paddingVertical: 0 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 9,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1, borderColor: colors.primary[100],
  },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: colors.primary[600] },
  summaryAmount: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  // Segmented tab
  segmentTrack: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary[100],
    borderRadius: 24,
    padding: 4,
    marginBottom: spacing.sm + 4,
  },
  segmentTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2, borderRadius: 8 },
  segmentTabActive: { backgroundColor: colors.primary[900], borderRadius: 24, ...shadow.sm },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.primary[900] },
  segmentTextActive: { color: colors.white },

  // Filter Sheet
  sheetContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontFamily: F.bold, fontSize: 20, color: colors.primary[900] },
  sheetScroll: {
    maxHeight: 400,
    paddingHorizontal: spacing.lg,
  },
  filterSectionTitle: {
    fontFamily: F.bold,
    fontSize: 14,
    color: colors.primary[900],
    marginBottom: spacing.sm,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOpt: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptActive: {
    backgroundColor: colors.primary[900],
  },
  filterOptText: {
    fontFamily: F.semi,
    fontSize: 14,
    color: colors.primary[700],
  },
  filterOptTextActive: {
    color: colors.white,
  },
  sheetFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
  },
  sheetApplyBtn: {
    backgroundColor: colors.primary[900],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  sheetApplyText: {
    fontFamily: F.bold,
    fontSize: 16,
    color: colors.white,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.primary[500] },

  // List
  listContent: { paddingTop: 0, paddingBottom: 100 },
  txnWrap: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderColor: colors.primary[100],
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  // First row of each section: top border + rounded top corners so the card
  // doesn't look "cut" at the top.
  txnWrapFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  txnWrapLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  txnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  txnIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  txnInfo: { flex: 1, marginRight: spacing.sm },
  txnLabel: { fontSize: 14, fontWeight: '600', color: colors.primary[900] },
  txnMeta: { fontSize: 12, color: colors.primary[500], marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '700' },
  // Full-width divider — no left indent so the line spans the whole card
  txnDivider: {
    height: 1,
    backgroundColor: colors.primary[100],
  },

  listFooter: { paddingVertical: spacing.md, alignItems: 'center' },

  // Empty state — flexGrow lets the ScrollView still bounce on pull-to-refresh
  // while justifyContent centres the card in the remaining list area.
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: spacing.xl + 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary[100],
  },
  emptyIconBg: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.primary[900], marginBottom: 4 },
  emptyDesc: {
    fontSize: 13,
    color: colors.primary[500],
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
    maxWidth: 260,
  },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary[900],
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.full,
  },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: colors.white },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 8,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary[900],
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },
});
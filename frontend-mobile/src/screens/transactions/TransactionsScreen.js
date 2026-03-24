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
  Modal as RNModal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { SCREEN_NAMES, CATEGORY_ICONS } from '../../utils/constants';
import { formatCurrency, formatSectionDate, formatDate, formatCurrencyCompact } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { ConfirmModal } from '../../components/common/Modal';

const TABS = ['Expenses', 'Income'];

/* helper: group flat list into date sections */
function groupByDate(items) {
  const map = {};
  items.forEach((item) => {
    const key = formatSectionDate(item.date);
    if (!map[key]) map[key] = { title: key, data: [] };
    map[key].data.push(item);
  });
  return Object.values(map);
}

export function TransactionsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expensePage, setExpensePage] = useState(1);
  const [incomePage, setIncomePage] = useState(1);
  const [expenseHasMore, setExpenseHasMore] = useState(true);
  const [incomeHasMore, setIncomeHasMore] = useState(true);

  // Summaries
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCatFilter, setSelectedCatFilter] = useState(null);
  const [categories, setCategories] = useState([]);

  // Expandable
  const [expandedId, setExpandedId] = useState(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Export modal
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [expRes, incRes, expSummary, incSummary, catRes] = await Promise.all([
        txnService.getExpenses({ ordering: '-date', page: 1, page_size: 20 }),
        txnService.getIncomes({ ordering: '-date', page: 1, page_size: 20 }),
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
        const next = expensePage + 1;
        const res = await txnService.getExpenses({ ordering: '-date', page: next, page_size: 20 });
        setExpenses((p) => [...p, ...(res.results || [])]);
        setExpensePage(next);
        setExpenseHasMore(!!res.next);
      } catch { /* ignore */ }
      setLoadingMore(false);
    } else if (activeTab === 1 && incomeHasMore) {
      setLoadingMore(true);
      try {
        const next = incomePage + 1;
        const res = await txnService.getIncomes({ ordering: '-date', page: next, page_size: 20 });
        setIncomes((p) => [...p, ...(res.results || [])]);
        setIncomePage(next);
        setIncomeHasMore(!!res.next);
      } catch { /* ignore */ }
      setLoadingMore(false);
    }
  };

  /* ─── filtered + sectioned data ─── */
  const raw = activeTab === 0 ? expenses : incomes;
  const hasMore = activeTab === 0 ? expenseHasMore : incomeHasMore;

  const filteredData = useMemo(() => {
    let list = raw;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => {
        const haystack = [t.description, t.merchant, t.source_name, t.category?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (selectedCatFilter) {
      list = list.filter((t) => t.category?.id === selectedCatFilter);
    }
    return list;
  }, [raw, searchQuery, selectedCatFilter]);

  const sections = useMemo(() => groupByDate(filteredData), [filteredData]);

  /* actions */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (activeTab === 0) {
        await txnService.deleteExpense(deleteTarget.id);
        setExpenses((p) => p.filter((e) => e.id !== deleteTarget.id));
      } else {
        await txnService.deleteIncome(deleteTarget.id);
        setIncomes((p) => p.filter((i) => i.id !== deleteTarget.id));
      }
      showToast('Deleted successfully', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      setExpandedId(null);
    }
  };

  const handleDuplicate = async (item) => {
    try {
      if (activeTab === 0) {
        const { id, created_at, updated_at, ...rest } = item;
        await txnService.createExpense({
          amount: rest.amount,
          description: rest.description,
          merchant: rest.merchant,
          date: rest.date,
          category_id: rest.category?.id || null,
          currency: rest.currency || 'NPR',
        });
      } else {
        await txnService.createIncome({
          amount: item.amount,
          source_name: item.source_name,
          description: item.description,
          date: item.date,
          category_id: item.category?.id || null,
          currency: item.currency || 'NPR',
        });
      }
      showToast('Duplicated! Refreshing...', 'success');
      fetchData(true);
    } catch {
      showToast('Failed to duplicate', 'error');
    }
  };

  const handleEdit = (item) => {
    setExpandedId(null);
    if (activeTab === 0) {
      navigation.navigate(SCREEN_NAMES.ADD_EXPENSE, { expense: item });
    } else {
      navigation.navigate(SCREEN_NAMES.ADD_INCOME, { income: item });
    }
  };

  const handleExport = () => {
    // For now show a coming-soon toast — real export requires a backend endpoint or client-side lib
    showToast(`Export as ${exportFormat.toUpperCase()} coming soon!`, 'info');
    setShowExport(false);
  };

  /* active tab categories */
  const tabCategories = useMemo(() => {
    const type = activeTab === 0 ? 'expense' : 'income';
    return categories.filter((c) => c.type === type);
  }, [categories, activeTab]);

  /* render */
  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const isExpense = activeTab === 0;
    const catName = item.category?.name || 'Other';
    const catColor = item.category?.color || colors.primary[400];
    const iconName = CATEGORY_ICONS[catName] || 'more-horiz';
    const label = isExpense
      ? item.description || item.merchant || 'Expense'
      : item.source_name || item.description || 'Income';
    const isExpanded = expandedId === item.id;

    return (
      <View>
        <TouchableOpacity
          style={[styles.txnItem, isExpanded && styles.txnItemExpanded]}
          activeOpacity={0.7}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={[styles.txnIcon, { backgroundColor: catColor + '20' }]}>
            <MaterialIcons name={iconName} size={20} color={catColor} />
          </View>
          <View style={styles.txnInfo}>
            <Text style={styles.txnLabel} numberOfLines={1}>{label}</Text>
            <Text style={styles.txnMeta}>{catName}</Text>
          </View>
          <View style={styles.txnRight}>
            <Text style={[styles.txnAmount, { color: isExpense ? colors.danger[500] : colors.accent[600] }]}>
              {isExpense ? '-' : '+'}{formatCurrency(item.amount, item.currency)}
            </Text>
            <MaterialIcons
              name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={20}
              color={colors.primary[400]}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded details */}
        {isExpanded && (
          <View style={styles.expandedCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(item.date)}</Text>
            </View>
            {isExpense && item.merchant ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Merchant</Text>
                <Text style={styles.detailValue}>{item.merchant}</Text>
              </View>
            ) : null}
            {!isExpense && item.source_name ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>{item.source_name}</Text>
              </View>
            ) : null}
            {item.description ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{item.description}</Text>
              </View>
            ) : null}
            {item.is_recurring && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Recurring</Text>
                <Text style={[styles.detailValue, { color: colors.accent[600] }]}>Yes</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.expandedActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                <MaterialIcons name="edit" size={18} color={colors.info[500]} />
                <Text style={[styles.actionText, { color: colors.info[500] }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicate(item)}>
                <MaterialIcons name="content-copy" size={18} color={colors.accent[600]} />
                <Text style={[styles.actionText, { color: colors.accent[600] }]}>Duplicate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setDeleteTarget(item)}>
                <MaterialIcons name="delete-outline" size={18} color={colors.danger[500]} />
                <Text style={[styles.actionText, { color: colors.danger[500] }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.listFooter}>
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

  const balance = incomeTotal - expenseTotal;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.iconBtn}>
            <MaterialIcons name="search" size={22} color={colors.primary[700]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExport(true)} style={styles.iconBtn}>
            <MaterialIcons name="file-download" size={22} color={colors.primary[700]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.primary[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 0 ? 'Search expenses...' : 'Search income...'}
            placeholderTextColor={colors.primary[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={colors.primary[400]} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.danger[400] }]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.danger[500] }]}>
            {formatCurrencyCompact(expenseTotal)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.accent[400] }]}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: colors.accent[600] }]}>
            {formatCurrencyCompact(incomeTotal)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: balance >= 0 ? colors.accent[400] : colors.danger[400] }]}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={[styles.summaryValue, { color: balance >= 0 ? colors.accent[600] : colors.danger[500] }]}>
            {formatCurrencyCompact(Math.abs(balance))}
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === idx && styles.tabActive]}
            onPress={() => { setActiveTab(idx); setExpandedId(null); setSelectedCatFilter(null); setSearchQuery(''); }}
          >
            <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category filter chips */}
      {tabCategories.length > 0 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedCatFilter && styles.filterChipActive]}
            onPress={() => setSelectedCatFilter(null)}
          >
            <Text style={[styles.filterChipText, !selectedCatFilter && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {tabCategories.slice(0, 6).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, selectedCatFilter === cat.id && styles.filterChipActive]}
              onPress={() => setSelectedCatFilter(selectedCatFilter === cat.id ? null : cat.id)}
            >
              <Text style={[styles.filterChipText, selectedCatFilter === cat.id && styles.filterChipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Transaction List — SectionList grouped by date */}
      {filteredData.length === 0 ? (
        <EmptyState
          icon={activeTab === 0 ? 'receipt-long' : 'account-balance-wallet'}
          title={activeTab === 0 ? 'No expenses yet' : 'No income yet'}
          description={
            searchQuery || selectedCatFilter
              ? 'No transactions match your filters.'
              : activeTab === 0
                ? 'Start tracking your spending by adding your first expense.'
                : 'Record your income sources to track your earnings.'
          }
          actionTitle={searchQuery || selectedCatFilter ? 'Clear Filters' : (activeTab === 0 ? 'Add Expense' : 'Add Income')}
          onAction={() => {
            if (searchQuery || selectedCatFilter) {
              setSearchQuery('');
              setSelectedCatFilter(null);
            } else {
              navigation.navigate(activeTab === 0 ? SCREEN_NAMES.ADD_EXPENSE : SCREEN_NAMES.ADD_INCOME);
            }
          }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent[600]]} />
          }
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate(activeTab === 0 ? SCREEN_NAMES.ADD_EXPENSE : SCREEN_NAMES.ADD_INCOME)}
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Transaction"
        message={`Are you sure you want to delete this ${activeTab === 0 ? 'expense' : 'income'}? This cannot be undone.`}
        confirmTitle="Delete"
        confirmVariant="danger"
        icon="delete-outline"
        iconColor={colors.danger[500]}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* Export Modal */}
      <RNModal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <TouchableOpacity style={styles.exportOverlay} activeOpacity={1} onPress={() => setShowExport(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.exportSheet}>
            <View style={styles.exportHandle} />
            <Text style={styles.exportTitle}>Export Data</Text>

            <Text style={styles.exportLabel}>Format</Text>
            <View style={styles.exportFormatRow}>
              {['csv', 'pdf'].map((fmt) => (
                <TouchableOpacity
                  key={fmt}
                  style={[styles.exportFormatBtn, exportFormat === fmt && styles.exportFormatBtnActive]}
                  onPress={() => setExportFormat(fmt)}
                >
                  <MaterialIcons
                    name={fmt === 'csv' ? 'table-chart' : 'picture-as-pdf'}
                    size={20}
                    color={exportFormat === fmt ? colors.accent[600] : colors.primary[500]}
                  />
                  <Text style={[styles.exportFormatText, exportFormat === fmt && styles.exportFormatTextActive]}>
                    {fmt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.exportLabel}>Date Range (optional)</Text>
            <View style={styles.exportDateRow}>
              <TextInput
                style={styles.exportDateInput}
                placeholder="From (YYYY-MM-DD)"
                placeholderTextColor={colors.primary[400]}
                value={exportDateFrom}
                onChangeText={setExportDateFrom}
              />
              <Text style={styles.exportDateDash}>—</Text>
              <TextInput
                style={styles.exportDateInput}
                placeholder="To (YYYY-MM-DD)"
                placeholderTextColor={colors.primary[400]}
                value={exportDateTo}
                onChangeText={setExportDateTo}
              />
            </View>

            <Button title={`Export as ${exportFormat.toUpperCase()}`} onPress={handleExport} variant="accent" size="lg" fullWidth style={{ marginTop: spacing.md }} />
            <Button title="Cancel" onPress={() => setShowExport(false)} variant="ghost" size="md" fullWidth style={{ marginTop: spacing.xs }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { ...typography.h1, fontSize: 24 },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[200], paddingHorizontal: spacing.sm, height: 40 },
  searchInput: { flex: 1, ...typography.body, fontSize: 14, color: colors.primary[800], marginLeft: spacing.xs, paddingVertical: 0 },

  // Summary
  summaryRow: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.sm },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.sm, padding: spacing.sm, borderLeftWidth: 3 },
  summaryLabel: { ...typography.caption, color: colors.primary[400], marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: '700' },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.primary[100], borderRadius: borderRadius.md, padding: 3 },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderRadius: borderRadius.sm },
  tabActive: { backgroundColor: colors.white, ...shadow.sm },
  tabText: { ...typography.bodySmall, color: colors.primary[500], fontWeight: '600' },
  tabTextActive: { color: colors.primary[800] },

  // Category filter
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.xs, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[200] },
  filterChipActive: { backgroundColor: colors.accent[50], borderColor: colors.accent[500] },
  filterChipText: { ...typography.caption, color: colors.primary[500], fontWeight: '500' },
  filterChipTextActive: { color: colors.accent[700] },

  // Section headers
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  sectionTitle: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5 },

  // List
  list: { paddingBottom: 100 },
  txnItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: 1, borderWidth: 1, borderColor: colors.primary[100] },
  txnItemExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0, borderBottomWidth: 0 },
  txnIcon: { width: 42, height: 42, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  txnInfo: { flex: 1, marginRight: spacing.sm },
  txnLabel: { ...typography.body, fontSize: 14, color: colors.primary[800], fontWeight: '500' },
  txnMeta: { ...typography.caption, color: colors.primary[400], marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 14, fontWeight: '600' },

  // Expanded
  expandedCard: { marginHorizontal: spacing.lg, backgroundColor: colors.primary[50], borderWidth: 1, borderTopWidth: 0, borderColor: colors.primary[100], borderBottomLeftRadius: borderRadius.md, borderBottomRightRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  detailLabel: { ...typography.caption, color: colors.primary[400] },
  detailValue: { ...typography.caption, color: colors.primary[700], fontWeight: '500' },
  expandedActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.primary[200] },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  actionText: { fontSize: 12, fontWeight: '600' },

  listFooter: { paddingVertical: spacing.md, alignItems: 'center' },

  // FAB
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg + 4, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent[600], alignItems: 'center', justifyContent: 'center', ...shadow.lg },

  // Export modal
  exportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  exportSheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  exportHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.primary[200], alignSelf: 'center', marginBottom: spacing.md },
  exportTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
  exportLabel: { ...typography.label, marginBottom: spacing.sm },
  exportFormatRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  exportFormatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary[200] },
  exportFormatBtnActive: { borderColor: colors.accent[500], backgroundColor: colors.accent[50] },
  exportFormatText: { ...typography.bodySmall, fontWeight: '600', color: colors.primary[500] },
  exportFormatTextActive: { color: colors.accent[700] },
  exportDateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exportDateInput: { flex: 1, borderWidth: 1, borderColor: colors.primary[200], borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, ...typography.bodySmall, color: colors.primary[700] },
  exportDateDash: { color: colors.primary[400] },
});

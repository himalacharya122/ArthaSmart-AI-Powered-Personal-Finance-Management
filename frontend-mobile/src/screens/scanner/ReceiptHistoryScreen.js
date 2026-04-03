/**
 * ReceiptHistoryScreen, Browse all scanned receipts.
 *
 * - Filter: All / Saved / Drafts
 * - Search by merchant name
 * - Tap to open ReceiptReviewScreen
 * - Swipe to delete (or long-press)
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { SCREEN_NAMES, CATEGORY_ICONS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';

let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch { AsyncStorage = null; }

const FILTERS = ['All', 'Saved', 'Drafts'];

export function ReceiptHistoryScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);
  const RECEIPTS_STORAGE_KEY = `arthasmart_receipts_${user?.id || 'guest'}`;
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const loadReceipts = useCallback(async () => {
    try {
      if (!AsyncStorage) return;
      const stored = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
      if (stored) setReceipts(JSON.parse(stored));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadReceipts(); }, [loadReceipts]));

  // Filter + search
  const filtered = receipts.filter((r) => {
    if (filter === 'Saved' && !r.savedAsExpense) return false;
    if (filter === 'Drafts' && r.savedAsExpense) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.merchant || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleDelete = (receiptId) => {
    Alert.alert('Delete Receipt', 'This receipt will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = receipts.filter((r) => r.id !== receiptId);
          setReceipts(updated);
          try {
            await AsyncStorage?.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(updated));
            showToast('Receipt deleted', 'success');
          } catch {
            showToast('Failed to delete receipt', 'error');
          }
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Receipts', 'All scanned receipt history will be removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          setReceipts([]);
          try {
            await AsyncStorage?.removeItem(RECEIPTS_STORAGE_KEY);
            showToast('All receipts cleared', 'success');
          } catch {
            showToast('Failed to clear receipts', 'error');
          }
        },
      },
    ]);
  };

  const renderReceipt = ({ item }) => (
    <TouchableOpacity
      style={styles.receiptCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(SCREEN_NAMES.SCAN_REVIEW, {
        receiptData: item,
        imageUri: item.imageUri,
        isFromHistory: true,
      })}
      onLongPress={() => handleDelete(item.id)}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <MaterialIcons name="receipt" size={22} color={colors.primary[400]} />
        </View>
      )}

      <View style={styles.receiptInfo}>
        <Text style={styles.receiptMerchant} numberOfLines={1}>
          {item.merchant || 'Unknown Merchant'}
        </Text>
        <View style={styles.receiptMeta}>
          <MaterialIcons
            name={CATEGORY_ICONS[item.category] || 'label'}
            size={14}
            color={colors.primary[400]}
          />
          <Text style={styles.receiptCategory}>{item.category || 'Other'}</Text>
          <Text style={styles.receiptDot}>·</Text>
          <Text style={styles.receiptDate}>{formatDate(item.savedAt || item.date)}</Text>
        </View>
      </View>

      <View style={styles.receiptRight}>
        <Text style={styles.receiptAmount}>
          {item.amount ? formatCurrency(item.amount) : '—'}
        </Text>
        <View style={[
          styles.statusPill,
          item.savedAsExpense ? styles.statusSaved : styles.statusDraft,
        ]}>
          <Text style={[
            styles.statusPillText,
            item.savedAsExpense ? styles.statusSavedText : styles.statusDraftText,
          ]}>
            {item.savedAsExpense ? 'Saved' : 'Draft'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[800]} />
        </TouchableOpacity>
        <Text style={typography.h3}>Receipt History</Text>
        {receipts.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.backBtn}>
            <MaterialIcons name="delete-outline" size={22} color={colors.danger[500]} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color={colors.primary[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by merchant or category..."
          placeholderTextColor={colors.primary[300]}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={colors.primary[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            activeOpacity={0.7}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f}
              {f === 'All' && ` (${receipts.length})`}
              {f === 'Saved' && ` (${receipts.filter((r) => r.savedAsExpense).length})`}
              {f === 'Drafts' && ` (${receipts.filter((r) => !r.savedAsExpense).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Receipt list */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary[400]} style={{ marginTop: spacing.xxl }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="receipt-long" size={48} color={colors.primary[200]} />
          <Text style={styles.emptyTitle}>
            {search ? 'No matches found' : filter !== 'All' ? `No ${filter.toLowerCase()} receipts` : 'No receipts yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {search ? 'Try a different search term' : 'Scan a receipt to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderReceipt}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.primary[200],
  },
  searchInput: { flex: 1, ...typography.body, fontSize: 14, color: colors.primary[800], padding: 0 },

  // Filters
  filterRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.primary[200],
  },
  filterChipActive: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  filterChipText: { ...typography.buttonSmall, color: colors.primary[500] },
  filterChipTextActive: { color: colors.white },

  // Receipt card
  receiptCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  thumb: { width: 50, height: 60, borderRadius: borderRadius.sm, backgroundColor: colors.primary[100] },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  receiptInfo: { flex: 1, marginLeft: spacing.md },
  receiptMerchant: { ...typography.body, fontWeight: '600', fontSize: 14 },
  receiptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  receiptCategory: { ...typography.caption, fontSize: 11 },
  receiptDot: { color: colors.primary[300], fontSize: 11 },
  receiptDate: { ...typography.caption, fontSize: 11 },
  receiptRight: { alignItems: 'flex-end', marginLeft: spacing.sm },
  receiptAmount: { ...typography.body, fontWeight: '700', fontSize: 14 },
  statusPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginTop: 4,
  },
  statusSaved: { backgroundColor: colors.accent[50] },
  statusDraft: { backgroundColor: colors.warning[50] },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  statusSavedText: { color: colors.accent[700] },
  statusDraftText: { color: colors.warning[600] },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl },
  emptyTitle: { ...typography.body, color: colors.primary[400], marginTop: spacing.md },
  emptyHint: { ...typography.caption, marginTop: spacing.xs },
});

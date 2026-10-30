import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { CATEGORY_ICONS, SCREEN_NAMES } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/format';
import * as txnService from '../../services/transactions';
import { useAppStore } from '../../store/appStore';

const PAYMENT_METHOD_LABELS = {
  card: { label: 'Card', icon: 'credit-card' },
  cash: { label: 'Cash', icon: 'payments' },
  wallet: { label: 'Wallet', icon: 'account-balance-wallet' },
  bank: { label: 'Bank Transfer', icon: 'account-balance' },
};

/**
 * Read-only detail screen for a single transaction (expense or income).
 * Loads fresh data on focus so edits made elsewhere round-trip cleanly.
 *
 * route.params:
 *   - id (required)
 *   - type: 'expense' | 'income' (required)
 */
export function TransactionDetailScreen({ navigation, route }) {
  const { id, type } = route.params || {};
  const isExpense = type !== 'income';
  const showToast = useAppStore((s) => s.showToast);

  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = isExpense
        ? await txnService.getExpense(id)
        : await txnService.getIncome(id);
      setTxn(data);
    } catch {
      showToast('Failed to load transaction', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isExpense, showToast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleEdit = () => {
    if (isExpense) {
      navigation.navigate(SCREEN_NAMES.ADD_EXPENSE, { expense: txn });
    } else {
      navigation.navigate(SCREEN_NAMES.ADD_INCOME, { income: txn });
    }
  };

  const handleDuplicate = () => {
    Alert.alert(
      'Duplicate this transaction?',
      `A copy will be added with today's date. The original ${isExpense ? 'expense' : 'income'} stays unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          style: 'default',
          onPress: async () => {
            setDuplicating(true);
            try {
              const today = new Date().toISOString().split('T')[0];
              if (isExpense) {
                const payload = {
                  amount: txn.amount,
                  description: txn.description || '',
                  notes: txn.notes || '',
                  merchant: txn.merchant || '',
                  date: today,
                  currency: txn.currency || 'NPR',
                  payment_method: txn.payment_method || '',
                };
                if (txn.category?.id) payload.category_id = txn.category.id;
                if (txn.metadata) payload.metadata = { ...txn.metadata, attached_receipt_uri: null };
                const created = await txnService.createExpense(payload);
                showToast('Expense duplicated', 'success');
                if (created?.id) {
                  navigation.replace(SCREEN_NAMES.TRANSACTION_DETAIL, { id: created.id, type: 'expense' });
                } else {
                  navigation.goBack();
                }
              } else {
                const payload = {
                  amount: txn.amount,
                  description: txn.description || '',
                  notes: txn.notes || '',
                  source_name: txn.source_name || '',
                  date: today,
                  currency: txn.currency || 'NPR',
                };
                if (txn.category?.id) payload.category_id = txn.category.id;
                const created = await txnService.createIncome(payload);
                showToast('Income duplicated', 'success');
                if (created?.id) {
                  navigation.replace(SCREEN_NAMES.TRANSACTION_DETAIL, { id: created.id, type: 'income' });
                } else {
                  navigation.goBack();
                }
              }
            } catch {
              showToast('Failed to duplicate', 'error');
            } finally {
              setDuplicating(false);
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      isExpense ? 'Delete expense?' : 'Delete income?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              if (isExpense) await txnService.deleteExpense(id);
              else await txnService.deleteIncome(id);
              showToast(isExpense ? 'Expense deleted' : 'Income deleted', 'info');
              navigation.goBack();
            } catch {
              showToast('Failed to delete', 'error');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !txn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isExpense ? 'Expense' : 'Income'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      </SafeAreaView>
    );
  }

  const catName = txn.category?.name || (isExpense ? 'Other' : 'Income');
  const catColor = txn.category?.color || colors.primary[400];
  const catIcon = CATEGORY_ICONS[catName] || (isExpense ? 'shopping-bag' : 'account-balance-wallet');
  const items = Array.isArray(txn.metadata?.items) ? txn.metadata.items : [];
  const isOcrSourced = txn.source === 'ocr' || txn.metadata?.source === 'ocr';
  const attachedReceiptUri = txn.metadata?.attached_receipt_uri;
  const pmInfo = txn.payment_method ? PAYMENT_METHOD_LABELS[txn.payment_method] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isExpense ? 'Expense' : 'Income'}</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.backBtn}>
          <MaterialIcons name="edit" size={20} color={colors.primary[700]} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero amount card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroIconBg, { backgroundColor: catColor + '20' }]}>
            <MaterialIcons name={catIcon} size={26} color={catColor} />
          </View>
          <Text style={styles.heroLabel}>{isExpense ? 'AMOUNT SPENT' : 'AMOUNT RECEIVED'}</Text>
          <Text style={[styles.heroAmount, { color: isExpense ? colors.danger[500] : colors.accent[600] }]}>
            {isExpense ? '-' : '+'}{formatCurrency(txn.amount, txn.currency)}
          </Text>
          <View style={styles.heroSub}>
            <MaterialIcons name="event" size={14} color={colors.primary[500]} />
            <Text style={styles.heroSubText}>{formatDate(txn.date)}</Text>
          </View>
        </View>

        {/* Details section */}
        <Text style={styles.sectionLabel}>DETAILS</Text>
        <View style={styles.cardGroup}>
          <DetailRow icon="label" label="Category" value={catName} />

          {isExpense && txn.merchant ? (
            <DetailRow icon="store" label="Merchant" value={txn.merchant} />
          ) : null}

          {!isExpense && txn.source_name ? (
            <DetailRow icon="account-balance" label="Source" value={txn.source_name} />
          ) : null}

          {txn.description ? (
            <DetailRow icon="short-text" label="Description" value={txn.description} multiline />
          ) : null}

          {pmInfo ? (
            <DetailRow icon={pmInfo.icon} label="Payment Method" value={pmInfo.label} />
          ) : null}

          {txn.is_recurring ? (
            <DetailRow icon="autorenew" label="Recurring" value="Yes" valueColor={colors.accent[600]} />
          ) : null}

          <DetailRow
            icon="bolt"
            label="Logged via"
            value={sourceLabel(txn.source)}
          />

          <DetailRow
            icon="schedule"
            label="Added"
            value={formatTimestamp(txn.created_at)}
            isLast
          />
        </View>

        {/* Notes */}
        {txn.notes ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>NOTES</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{txn.notes}</Text>
            </View>
          </>
        ) : null}

        {/* Attached receipt image */}
        {attachedReceiptUri ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>RECEIPT</Text>
            <View style={styles.receiptImageCard}>
              <Image
                source={{ uri: attachedReceiptUri }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            </View>
          </>
        ) : null}

        {/* Line items (from OCR scans) */}
        {items.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
              ITEMS ({items.length})
            </Text>
            <View style={styles.cardGroup}>
              {items.map((it, idx) => {
                const qty = Number(it.qty) > 0 ? Number(it.qty) : 1;
                return (
                  <View
                    key={idx}
                    style={[styles.itemRow, idx === items.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={styles.itemNameWrap}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {it.name || 'Item'}
                      </Text>
                      <Text style={styles.itemQty}>×{qty}</Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {formatCurrency(it.price, txn.currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {isOcrSourced && items.length === 0 && !attachedReceiptUri && (
          <Text style={styles.hint}>
            No line items captured for this scan. Re-scan the receipt to add items.
          </Text>
        )}

        <View style={{ height: spacing.lg }} />

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.duplicateBtn, duplicating && { opacity: 0.6 }]}
            onPress={handleDuplicate}
            disabled={duplicating || deleting}
            activeOpacity={0.7}
          >
            {duplicating ? (
              <ActivityIndicator size="small" color={colors.primary[700]} />
            ) : (
              <>
                <MaterialIcons name="content-copy" size={18} color={colors.primary[700]} />
                <Text style={styles.duplicateBtnText}>Duplicate</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={handleDelete}
            disabled={deleting || duplicating}
            activeOpacity={0.7}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger[600]} />
            ) : (
              <>
                <MaterialIcons name="delete-outline" size={18} color={colors.danger[600]} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value, valueColor, multiline, isLast }) {
  return (
    <View style={[styles.detailRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.detailIconBg}>
        <MaterialIcons name={icon} size={18} color={colors.primary[600]} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          valueColor && { color: valueColor },
          multiline && { textAlign: 'right', flex: 1, marginLeft: spacing.md },
        ]}
        numberOfLines={multiline ? undefined : 1}
      >
        {value}
      </Text>
    </View>
  );
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return '—';
  }
}

function sourceLabel(s) {
  switch (s) {
    case 'ocr': return 'Receipt scan';
    case 'chatbot': return 'AI Chat';
    case 'recurring': return 'Recurring rule';
    case 'import': return 'Import';
    case 'manual':
    default: return 'Manual entry';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Hero
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  heroIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: spacing.xs,
    letterSpacing: -0.5,
  },
  heroSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs + 2,
  },
  heroSubText: { ...typography.caption, color: colors.primary[500], fontWeight: '500' },

  // Section labels + grouped cards
  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  cardGroup: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  detailIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  detailLabel: { ...typography.body, fontSize: 14, color: colors.primary[500], flex: 1 },
  detailValue: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800] },

  // Notes
  notesCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  notesText: { ...typography.body, fontSize: 14, color: colors.primary[700], lineHeight: 21 },

  // Attached receipt
  receiptImageCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  receiptImage: {
    width: '100%',
    height: 220,
  },

  // Items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    gap: spacing.sm,
  },
  itemNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { ...typography.body, fontSize: 14, color: colors.primary[800], flexShrink: 1 },
  itemQty: { ...typography.caption, color: colors.primary[500], fontWeight: '600' },
  itemPrice: { ...typography.body, fontSize: 14, fontWeight: '700', color: colors.primary[800] },

  hint: { ...typography.caption, color: colors.primary[400], marginTop: spacing.sm, lineHeight: 17 },

  // Action row
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  duplicateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  duplicateBtnText: { ...typography.button, color: colors.primary[700], fontWeight: '700' },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger[50],
    borderWidth: 1,
    borderColor: colors.danger[100],
  },
  deleteBtnText: { ...typography.button, color: colors.danger[600], fontWeight: '700' },
});

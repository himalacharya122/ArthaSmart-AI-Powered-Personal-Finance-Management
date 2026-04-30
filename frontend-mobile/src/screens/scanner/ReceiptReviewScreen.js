/**
 * ReceiptReviewScreen, Review and edit OCR-extracted receipt data.
 *
 * - Editable fields: merchant, amount, date, category, notes
 * - Line items list from OCR
 * - AI category suggestion banner
 * - Save as expense --> calls createExpense API
 * - Save receipt locally for history
 */
import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import * as Clipboard from 'expo-clipboard';
import { SCREEN_NAMES, CATEGORY_ICONS } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';
import { createExpense, updateExpense, getCategories } from '../../services/transactions';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import {
  format, subMonths, addMonths, startOfMonth, endOfMonth,
  startOfWeek, isSameMonth, isSameDay, isBefore, isAfter,
  startOfDay, endOfDay,
} from 'date-fns';

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transport', 'Shopping',
  'Utilities', 'Health', 'Education', 'Entertainment', 'Rent', 'Other',
];

let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch { AsyncStorage = null; }

// Normalize OCR date to YYYY-MM-DD
const normalizeDate = (raw) => {
  if (!raw) return new Date().toISOString().split('T')[0];
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY or DD/MM/YYYY — try to parse
  const parts = raw.replace(/[.\-]/g, '/').split('/');
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    // YYYY/MM/DD
    if (a > 1000) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    // DD/MM/YYYY or MM/DD/YYYY - assume MM/DD/YYYY
    if (c > 1000) {
      const month = a <= 12 ? a : b;
      const day = a <= 12 ? b : a;
      return `${c}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
};

export function ReceiptReviewScreen({ navigation, route }) {
  const { receiptData, imageUri, source, isFromHistory } = route.params;
  const showToast = useAppStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);
  const RECEIPTS_STORAGE_KEY = `arthasmart_receipts_${user?.id || 'guest'}`;

  // Safe date parser helper
  const getSafeDate = (raw) => {
    if (!raw) return new Date();
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Editable fields — seed from previously-saved receipt so edits round-trip
  const [merchant, setMerchant] = useState(receiptData?.merchant || '');
  const [description, setDescription] = useState(receiptData?.description || '');
  const [amount, setAmount] = useState(receiptData?.amount ? String(receiptData.amount) : '');
  const [date, setDate] = useState(receiptData?.date ? normalizeDate(receiptData.date) : new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(receiptData?.category || 'Other');
  const [notes, setNotes] = useState(receiptData?.notes || '');
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [categoriesMap, setCategoriesMap] = useState({}); // { name -> id }
  const [rawTextCopied, setRawTextCopied] = useState(false);

  // Editable items list — seeded from OCR but user can add/edit/delete.
  // Always shown (even when empty) so users can manually add items.
  const [editableItems, setEditableItems] = useState(() =>
    (receiptData?.items || []).map((it, i) => ({
      _key: `seed-${i}-${Date.now()}`,
      name: String(it.name || ''),
      qty: it.qty != null ? String(it.qty) : '1',
      price: it.price != null ? String(it.price) : '',
    }))
  );

  // Persisted link from receipt → expense, so editing+resaving updates the
  // existing transaction rather than creating a duplicate.
  const linkedExpenseId = receiptData?.linkedExpenseId || null;

  const aiCategory = receiptData?.category;
  const hasAiSuggestion = aiCategory && aiCategory !== 'Other' && aiCategory !== category;

  const parsedAmount = parseFloat(amount) || 0;

  const updateItem = (key, field, val) => {
    setEditableItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, [field]: val } : it))
    );
  };
  const addItem = () => {
    setEditableItems((prev) => [
      ...prev,
      { _key: `new-${Date.now()}-${Math.random()}`, name: '', qty: '1', price: '' },
    ]);
  };
  const removeItem = (key) => {
    setEditableItems((prev) => prev.filter((it) => it._key !== key));
  };

  const handleCopyRawText = async () => {
    try {
      await Clipboard.setStringAsync(receiptData?.rawText || '');
      setRawTextCopied(true);
      setTimeout(() => setRawTextCopied(false), 1800);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  // Items list that gets persisted with the receipt (cleaned + numeric)
  const sanitizedItems = () =>
    editableItems
      .filter((it) => it.name.trim() || parseFloat(it.price) > 0)
      .map((it) => ({
        name: it.name.trim(),
        qty: parseInt(it.qty, 10) || 1,
        price: parseFloat(it.price) || 0,
      }));

  // Fetch backend categories to get name→id mapping
  useEffect(() => {
    getCategories('expense')
      .then((res) => {
        const results = res.results || res || [];
        const map = {};
        results.forEach((c) => { map[c.name] = c.id; });
        setCategoriesMap(map);
      })
      .catch(() => { });
  }, []);

  // Save receipt to local storage. Optionally records the linked expense id
  // so that subsequent edits update the same transaction (no duplicates).
  const saveReceiptLocally = async ({ savedAsExpense = false, expenseId = null } = {}) => {
    try {
      if (!AsyncStorage) return;
      const stored = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
      let all = stored ? JSON.parse(stored) : [];

      const receipt = {
        id: isFromHistory ? receiptData.id : `receipt_${Date.now()}`,
        merchant,
        description,
        amount: parsedAmount,
        date,
        category,
        notes,
        rawText: receiptData?.rawText || '',
        items: sanitizedItems(),
        imageUri,
        source,
        savedAsExpense,
        savedAt: new Date().toISOString(),
        ocrConfidence: receiptData?.ocrConfidence,
        // Persist the link to the backend expense so we update on re-save
        linkedExpenseId:
          expenseId ?? receiptData?.linkedExpenseId ?? null,
      };

      if (isFromHistory) {
        // Update existing
        all = all.map((r) => (r.id === receiptData.id ? receipt : r));
      } else {
        // Add new
        all.unshift(receipt);
      }

      // Keep max 100 receipts
      if (all.length > 100) all.length = 100;
      await AsyncStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('Failed to save receipt locally:', err);
    }
  };

  // Save as expense
  const handleSaveAsExpense = async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    setShowConfirmModal(false);
    setSaving(true);
    try {
      const normalizedDate = normalizeDate(date);
      const itemsPayload = sanitizedItems();
      const payload = {
        amount: parsedAmount.toFixed(2),
        // description, merchant and notes are real backend fields now.
        // Items live in metadata since there's no first-class items column.
        description: description || merchant || 'Scanned Receipt',
        merchant: merchant || undefined,
        notes: notes || '',
        date: normalizedDate,
        currency: 'NPR',
        // Mark as OCR-sourced so the detail screen's "Logged via" reads correctly
        source: 'ocr',
      };
      // Map category name → backend ID
      const catId = categoriesMap[category];
      if (catId) payload.category_id = catId;
      // Persist OCR provenance + items in metadata so the detail screen can
      // render the same line-item table users captured during review.
      payload.metadata = {
        source: source || 'ocr',
        items: itemsPayload,
      };

      // If this receipt has already been saved as an expense, UPDATE that
      // transaction instead of creating a new one (prevents duplicates).
      const isUpdate = !!linkedExpenseId;
      let resultId;
      if (isUpdate) {
        const updated = await updateExpense(linkedExpenseId, payload);
        resultId = updated?.id || linkedExpenseId;
      } else {
        const created = await createExpense(payload);
        resultId = created?.id || null;
      }

      await saveReceiptLocally({ savedAsExpense: true, expenseId: resultId });

      if (isUpdate) {
        // Quiet update — just confirm with a toast and return
        showToast('Receipt updated', 'success');
        navigation.popToTop();
      } else {
        // First-time save — celebratory success screen
        navigation.replace(SCREEN_NAMES.SUCCESS, {
          type: 'receipt_saved',
          data: {
            merchant: merchant || 'Scanned Receipt',
            amount: parsedAmount,
            itemCount: itemsPayload.length,
            confidence: receiptData?.ocrConfidence,
          },
        });
      }
      return;
    } catch (err) {
      // Show detailed backend validation errors
      const data = err?.response?.data;
      let errMsg = 'Failed to save expense';
      if (data) {
        if (typeof data === 'string') errMsg = data;
        else if (data.detail) errMsg = data.detail;
        else if (data.error) errMsg = data.error;
        else {
          // Collect field-level errors
          const fieldErrors = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
          if (fieldErrors) errMsg = fieldErrors;
        }
      }
      showToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save as draft (local only) — preserves linkedExpenseId if there is one
  const handleSaveDraft = async () => {
    await saveReceiptLocally({ savedAsExpense: !!linkedExpenseId });
    showToast('Receipt saved as draft', 'success');
    navigation.popToTop();
  };

  // Discard
  const handleDiscard = () => {
    Alert.alert('Discard Receipt?', 'This scanned receipt will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.popToTop() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDiscard} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={colors.primary[800]} />
          </TouchableOpacity>
          <Text style={typography.h3}>Review Receipt</Text>
          <TouchableOpacity onPress={() => setShowRawText(true)} style={styles.backBtn}>
            <MaterialIcons name="text-snippet" size={22} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Receipt image thumbnail */}
          {imageUri && (
            <View style={styles.imageRow}>
              <Image source={{ uri: imageUri }} style={styles.thumbImage} resizeMode="cover" />
              <View style={styles.imageInfo}>
                <Text style={styles.imageInfoTitle}>Receipt scanned</Text>
                <Text style={styles.imageInfoSub}>
                  {source === 'camera' ? 'Captured with camera' : 'Selected from gallery'}
                </Text>
                {receiptData?.ocrConfidence != null && (
                  <View style={styles.confidenceBadge}>
                    <MaterialIcons name="verified" size={14} color={colors.accent[600]} />
                    <Text style={styles.confidenceText}>
                      OCR confidence: {Math.round(receiptData.ocrConfidence)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* AI Category Suggestion */}
          {hasAiSuggestion && (
            <TouchableOpacity
              style={styles.aiSuggestion}
              activeOpacity={0.7}
              onPress={() => setCategory(aiCategory)}
            >
              <MaterialIcons name="auto-awesome" size={18} color={colors.accent[700]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aiSuggestionLabel}>AI Suggestion</Text>
                <Text style={styles.aiSuggestionText}>
                  Looks like <Text style={{ fontWeight: '700' }}>{aiCategory}</Text>
                </Text>
              </View>
              <View style={styles.acceptBtn}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Extracted Items — always visible, fully editable */}
          <View style={styles.itemsCard}>
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsTitle}>
                Extracted Items ({editableItems.length})
              </Text>
              <TouchableOpacity onPress={addItem} style={styles.itemsAddBtn} activeOpacity={0.7}>
                <MaterialIcons name="add" size={16} color={colors.accent[700]} />
                <Text style={styles.itemsAddText}>Add</Text>
              </TouchableOpacity>
            </View>

            {editableItems.length === 0 ? (
              <Text style={styles.itemsEmptyText}>
                No items detected. Tap "Add" to enter items manually.
              </Text>
            ) : (
              editableItems.map((item, i) => (
                <View
                  key={item._key}
                  style={[
                    styles.editLineItem,
                    i === editableItems.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.editItemTopRow}>
                    <TextInput
                      style={styles.editItemName}
                      value={item.name}
                      onChangeText={(v) => updateItem(item._key, 'name', v)}
                      placeholder="Item name"
                      placeholderTextColor={colors.primary[400]}
                    />
                    <TouchableOpacity
                      onPress={() => removeItem(item._key)}
                      style={styles.editItemRemove}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="close" size={18} color={colors.danger[500]} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editItemBottomRow}>
                    <View style={styles.editItemQtyWrap}>
                      <Text style={styles.editItemSmallLabel}>Qty</Text>
                      <TextInput
                        style={styles.editItemNumInput}
                        value={item.qty}
                        onChangeText={(v) =>
                          updateItem(item._key, 'qty', v.replace(/[^0-9]/g, ''))
                        }
                        placeholder="1"
                        placeholderTextColor={colors.primary[400]}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.editItemPriceWrap}>
                      <Text style={styles.editItemSmallLabel}>Price</Text>
                      <Text style={styles.editItemPriceSymbol}>Rs</Text>
                      <TextInput
                        style={styles.editItemNumInput}
                        value={item.price}
                        onChangeText={(v) =>
                          updateItem(item._key, 'price', v.replace(/[^0-9.]/g, ''))
                        }
                        placeholder="0.00"
                        placeholderTextColor={colors.primary[400]}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Editable fields */}
          <View style={[styles.fieldsCard, { marginTop: spacing.md }]}>
            {/* Merchant */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Merchant / Store</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="store" size={20} color={colors.primary[500]} />
                <TextInput
                  style={styles.fieldInput}
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="e.g. Bhatbhateni"
                  placeholderTextColor={colors.primary[400]}
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="short-text" size={20} color={colors.primary[500]} />
                <TextInput
                  style={styles.fieldInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What was this expense for?"
                  placeholderTextColor={colors.primary[400]}
                />
              </View>
            </View>

            {/* Amount */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Total Amount</Text>
              <View style={styles.inputRow}>
                <Text style={styles.currencyPrefix}>Rs</Text>
                <TextInput
                  style={[styles.fieldInput, styles.amountInput]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.primary[400]}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TouchableOpacity
                style={styles.inputRow}
                activeOpacity={0.7}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={colors.primary[500]} />
                <Text style={[styles.fieldInput, { paddingVertical: 2 }]}>{date}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
              </TouchableOpacity>
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <TouchableOpacity
                style={styles.inputRow}
                activeOpacity={0.7}
                onPress={() => setShowCategoryPicker(true)}
              >
                <MaterialIcons
                  name={CATEGORY_ICONS[category] || 'label'}
                  size={20}
                  color={colors.primary[500]}
                />
                <Text style={[styles.fieldInput, { paddingVertical: 2 }]}>{category}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <View style={[styles.inputRow, { alignItems: 'flex-start' }]}>
                <MaterialIcons name="notes" size={20} color={colors.primary[500]} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.fieldInput, { minHeight: 48, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a note about this receipt"
                  placeholderTextColor={colors.primary[400]}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          </View>

          {/* Spacer for buttons */}
          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.draftBtn} activeOpacity={0.7} onPress={handleSaveDraft}>
            <MaterialIcons name="save-alt" size={20} color={colors.primary[600]} />
            <Text style={styles.draftBtnText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!parsedAmount || saving) && { opacity: 0.5 }]}
            activeOpacity={0.8}
            onPress={() => setShowConfirmModal(true)}
            disabled={!parsedAmount || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color={colors.white} />
                <Text style={styles.saveBtnText}>Save as Expense</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Picker Modal */}
        <Modal visible={showCategoryPicker} transparent animationType="fade">
          <View style={styles.confirmOverlay}>
            <Pressable 
              style={StyleSheet.absoluteFill} 
              onPress={() => setShowCategoryPicker(false)} 
            />
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Select Category</Text>
              <ScrollView style={{ maxHeight: 300, width: '100%' }} showsVerticalScrollIndicator={false}>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catOption, category === cat && styles.catOptionActive]}
                    activeOpacity={0.7}
                    onPress={() => { setCategory(cat); setShowCategoryPicker(false); }}
                  >
                    <MaterialIcons
                      name={CATEGORY_ICONS[cat] || 'label'}
                      size={22}
                      color={category === cat ? colors.accent[600] : colors.primary[500]}
                    />
                    <Text style={[styles.catOptionText, category === cat && styles.catOptionTextActive]}>
                      {cat}
                    </Text>
                    {category === cat && (
                      <MaterialIcons name="check-circle" size={20} color={colors.accent[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeSheetBtn}
                onPress={() => setShowCategoryPicker(false)}
              >
                <Text style={styles.closeSheetBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Picker Modal */}
        <CalendarPickerModal
          visible={showDatePicker}
          initialDate={getSafeDate(date)}
          onClose={() => setShowDatePicker(false)}
          onPick={(d) => {
            setDate(format(d, 'yyyy-MM-dd'));
            setShowDatePicker(false);
          }}
          title="Select Receipt Date"
        />

        {/* Raw Text Modal */}
        <Modal visible={showRawText} transparent animationType="fade">
          <View style={styles.confirmOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowRawText(false)}
            />
            <View style={styles.confirmCard}>
              <View style={styles.rawTextHeader}>
                <Text style={styles.confirmTitle}>Raw OCR Text</Text>
                <TouchableOpacity
                  style={[styles.copyBtn, rawTextCopied && styles.copyBtnDone]}
                  onPress={handleCopyRawText}
                  activeOpacity={0.7}
                  disabled={!receiptData?.rawText}
                >
                  <MaterialIcons
                    name={rawTextCopied ? 'check' : 'content-copy'}
                    size={16}
                    color={rawTextCopied ? colors.accent[700] : colors.primary[700]}
                  />
                  <Text
                    style={[
                      styles.copyBtnText,
                      rawTextCopied && { color: colors.accent[700] },
                    ]}
                  >
                    {rawTextCopied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 400, width: '100%' }} showsVerticalScrollIndicator={false}>
                <Text style={styles.rawText}>{receiptData?.rawText || 'No text extracted'}</Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.closeSheetBtn}
                onPress={() => setShowRawText(false)}
              >
                <Text style={styles.closeSheetBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Confirm Save Modal */}
        <Modal visible={showConfirmModal} transparent animationType="fade">
          <View style={styles.confirmOverlay}>
            <Pressable 
              style={StyleSheet.absoluteFill} 
              onPress={() => setShowConfirmModal(false)} 
            />
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <MaterialIcons name="receipt-long" size={32} color={colors.accent[600]} />
              </View>
              <Text style={styles.confirmTitle}>Save as Expense?</Text>
              
              <View style={styles.confirmSummary}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Merchant</Text>
                  <Text style={styles.confirmValue}>{merchant || '—'}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Amount</Text>
                  <Text style={[styles.confirmValue, { fontWeight: '700', color: colors.accent[600] }]}>
                    {formatCurrency(parsedAmount)}
                  </Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Category</Text>
                  <Text style={styles.confirmValue}>{category}</Text>
                </View>
              </View>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmSaveBtn}
                  onPress={handleSaveAsExpense}
                >
                  <Text style={styles.confirmSaveText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { flex: 1, paddingHorizontal: spacing.lg },

  // Image row
  imageRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: borderRadius.md, padding: spacing.sm + 2, marginTop: spacing.sm, marginBottom: spacing.md, ...shadow.sm,
  },
  thumbImage: { width: 60, height: 72, borderRadius: borderRadius.sm },
  imageInfo: { flex: 1, marginLeft: spacing.md },
  imageInfoTitle: { ...typography.body, fontWeight: '600', fontSize: 14 },
  imageInfoSub: { ...typography.caption, marginTop: 2 },
  confidenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs,
    backgroundColor: colors.accent[50], paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm, alignSelf: 'flex-start',
  },
  confidenceText: { fontSize: 11, fontWeight: '600', color: colors.accent[700] },

  // AI Suggestion
  aiSuggestion: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accent[200], borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.accent[100],
  },
  aiSuggestionLabel: { fontSize: 11, fontWeight: '700', color: colors.accent[700], textTransform: 'uppercase' },
  aiSuggestionText: { ...typography.body, color: colors.accent[800] },
  acceptBtn: {
    backgroundColor: colors.accent[800], paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs, borderRadius: borderRadius.sm,
  },
  acceptBtnText: { ...typography.buttonSmall, color: colors.white },

  // Fields card
  fieldsCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, ...shadow.sm,
  },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary[50], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.primary[200],
  },
  fieldInput: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    color: colors.primary[800],
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  currencyPrefix: { ...typography.body, fontWeight: '700', color: colors.primary[600] },
  amountInput: { fontSize: 18, fontWeight: '600' },

  // Line items — editable
  itemsCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.md, ...shadow.sm,
  },
  itemsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemsTitle: { ...typography.label, fontSize: 14 },
  itemsAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent[50], paddingHorizontal: spacing.sm + 2, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  itemsAddText: { fontSize: 12, fontWeight: '700', color: colors.accent[700] },
  itemsEmptyText: {
    ...typography.caption, color: colors.primary[500],
    paddingVertical: spacing.md, textAlign: 'center',
  },
  editLineItem: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 0.5, borderBottomColor: colors.primary[100],
    gap: spacing.sm,
  },
  editItemTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  editItemName: {
    flex: 1,
    fontSize: 14, color: colors.primary[800],
    backgroundColor: colors.primary[50],
    borderWidth: 1, borderColor: colors.primary[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 11,
    minHeight: 44,
  },
  editItemRemove: {
    width: 36, height: 36, borderRadius: borderRadius.sm,
    backgroundColor: colors.danger[50],
    alignItems: 'center', justifyContent: 'center',
  },
  editItemBottomRow: { flexDirection: 'row', gap: spacing.sm },
  editItemQtyWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary[50],
    borderWidth: 1, borderColor: colors.primary[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    minHeight: 44, width: 110,
  },
  editItemPriceWrap: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary[50],
    borderWidth: 1, borderColor: colors.primary[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    minHeight: 44,
  },
  editItemSmallLabel: { ...typography.caption, color: colors.primary[500], fontWeight: '600' },
  editItemPriceSymbol: { ...typography.caption, color: colors.primary[600], fontWeight: '700' },
  editItemNumInput: {
    flex: 1,
    fontSize: 15, fontWeight: '600',
    color: colors.primary[800], padding: 0, textAlign: 'right',
    minHeight: 28,
  },

  // Raw text modal
  rawTextHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginBottom: spacing.md,
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm + 2, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  copyBtnDone: { backgroundColor: colors.accent[50] },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary[700] },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, backgroundColor: colors.white,
    borderTopWidth: 0.5, borderTopColor: colors.primary[200], ...shadow.md,
  },
  draftBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary[300],
  },
  draftBtnText: { ...typography.button, color: colors.primary[600] },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm + 4, backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
  },
  saveBtnText: { ...typography.button, color: colors.white },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.primary[200],
    alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.h3, marginBottom: spacing.md },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md, marginBottom: 2,
  },
  catOptionActive: { backgroundColor: colors.accent[50] },
  catOptionText: { ...typography.body, flex: 1 },
  catOptionTextActive: { color: colors.accent[700], fontWeight: '600' },
  rawText: {
    ...typography.bodySmall, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: colors.primary[50], padding: spacing.md, borderRadius: borderRadius.md,
    lineHeight: 20,
  },
  closeSheetBtn: {
    alignItems: 'center', paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.primary[100], borderRadius: borderRadius.md,
  },
  closeSheetBtnText: { ...typography.button, color: colors.primary[600] },

  // Confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmCard: {
    width: '90%', backgroundColor: colors.white, borderRadius: borderRadius.md,
    padding: spacing.lg, alignItems: 'center', ...shadow.lg,
  },
  confirmIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent[50],
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  confirmTitle: { ...typography.h3, marginBottom: spacing.md },
  confirmSummary: { width: '100%', marginBottom: spacing.lg },
  confirmRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.primary[100],
  },
  confirmLabel: { ...typography.bodySmall, color: colors.primary[500] },
  confirmValue: { ...typography.body, fontWeight: '500', fontSize: 14 },
  confirmActions: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  confirmCancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary[300],
  },
  confirmCancelText: { ...typography.button, color: colors.primary[600] },
  confirmSaveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm + 2, backgroundColor: colors.accent[600],
    borderRadius: borderRadius.md,
  },
  confirmSaveText: { ...typography.button, color: colors.white },
});

/**
 * Calendar Picker Component
 */
function CalendarPickerModal({ visible, initialDate, onClose, onPick, title }) {
  const safeInitDate = useMemo(() => {
    if (!initialDate || isNaN(new Date(initialDate).getTime())) return new Date();
    return new Date(initialDate);
  }, [initialDate]);

  const [viewMonth, setViewMonth] = useState(safeInitDate);

  useEffect(() => {
    if (visible) setViewMonth(safeInitDate);
  }, [visible, safeInitDate]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const cells = [];
    let cursor = gridStart;
    for (let i = 0; i < 42; i++) {
      cells.push(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    return { cells, monthStart, monthEnd };
  }, [viewMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cal.overlay}>
        <View style={cal.sheet}>
          <Text style={cal.title}>{title}</Text>

          <View style={cal.monthNav}>
            <TouchableOpacity onPress={() => setViewMonth(subMonths(viewMonth, 1))} style={cal.navBtn}>
              <MaterialIcons name="chevron-left" size={24} color={colors.primary[700]} />
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={() => setViewMonth(addMonths(viewMonth, 1))} style={cal.navBtn}>
              <MaterialIcons name="chevron-right" size={24} color={colors.primary[700]} />
            </TouchableOpacity>
          </View>

          <View style={cal.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={cal.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={cal.grid}>
            {days.cells.map((d, idx) => {
              const inMonth = isSameMonth(d, viewMonth);
              const today = isSameDay(d, new Date());
              const selected = isSameDay(d, initialDate);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[cal.dayCell, selected && cal.dayCellSelected]}
                  onPress={() => onPick(d)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    cal.dayText,
                    !inMonth && cal.dayTextOutMonth,
                    today && !selected && cal.dayTextToday,
                    selected && cal.dayTextSelected,
                  ]}>
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={cal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={cal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 360, backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.lg },
  title: { ...typography.h3, fontSize: 16, color: colors.primary[800], marginBottom: spacing.md, textAlign: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary[50] },
  monthLabel: { ...typography.body, fontSize: 15, fontWeight: '600', color: colors.primary[800] },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.primary[400] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-center', justifyContent: 'center', },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm },
  dayCellSelected: { backgroundColor: colors.primary[800] },
  dayText: { fontSize: 14, fontWeight: '500', color: colors.primary[700] },
  dayTextOutMonth: { color: colors.primary[300] },
  dayTextDisabled: { color: colors.primary[200] },
  dayTextToday: { color: colors.accent[600], fontWeight: '700' },
  dayTextSelected: { color: colors.white, fontWeight: '700' },
  cancelBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { ...typography.body, color: colors.primary[500], fontSize: 15 },
});
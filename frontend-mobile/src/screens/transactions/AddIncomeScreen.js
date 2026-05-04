import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import {
  format,
  subMonths,
  addMonths,
  startOfMonth,
  startOfWeek,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { CATEGORY_ICONS, SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { isOnline, enqueue } from '../../services/offline';

const QUICK_RECURRING = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom' },
];

const CUSTOM_FREQUENCIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Biweekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Select date';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return format(d, 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function AddIncomeScreen({ navigation, route }) {
  const editData = route?.params?.income;
  const isEdit = !!editData;
  const today = format(new Date(), 'yyyy-MM-dd');

  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(editData?.category?.id || null);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Recurring
  const [isRecurring, setIsRecurring] = useState(editData?.is_recurring || false);
  const [recurringFreq, setRecurringFreq] = useState('monthly');
  const [customFreq, setCustomFreq] = useState('monthly');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState(null);

  // Dirty tracking
  const isDirtyRef = useRef(false);
  const markDirty = useCallback(() => { isDirtyRef.current = true; }, []);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: editData?.amount ? String(editData.amount) : '',
      source_name: editData?.source_name || '',
      description: editData?.description || '',
      notes: editData?.notes || '',
      date: editData?.date || today,
    },
  });

  const watchedDate = watch('date');

  // Intercept back-navigation when dirty
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      Alert.alert(
        'Discard Changes?',
        'All changes will be discarded.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { isDirtyRef.current = false; navigation.dispatch(e.data.action); } },
        ],
      );
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    txnService.getCategories('income').then((res) => {
      setCategories(res.results || []);
    }).catch(() => { });
  }, []);

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.id === selectedCategory),
    [categories, selectedCategory],
  );

  const effectiveFreq = recurringFreq === 'custom' ? customFreq : recurringFreq;

  const getRecurringLabel = () => {
    if (recurringFreq === 'custom') {
      return CUSTOM_FREQUENCIES.find((f) => f.key === customFreq)?.label || 'Custom';
    }
    return QUICK_RECURRING.find((f) => f.key === recurringFreq)?.label || '';
  };

  const handleBack = () => {
    if (isDirtyRef.current) {
      Alert.alert('Discard Changes?', 'All changes will be discarded.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { isDirtyRef.current = false; navigation.goBack(); } },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(values.amount).toFixed(2),
        source_name: values.source_name,
        description: values.description || '',
        notes: values.notes || '',
        date: values.date,
        category_id: selectedCategory || null,
        currency: 'NPR',
      };

      if (isEdit) {
        await txnService.updateIncome(editData.id, payload);

        if (isRecurring) {
          try {
            await txnService.createRecurringTransaction({
              type: 'income',
              amount: payload.amount,
              currency: 'NPR',
              description: values.description || '',
              source_name: values.source_name || '',
              frequency: effectiveFreq,
              next_occurrence: values.date,
              ...(selectedCategory && { category_id: selectedCategory }),
              ...(hasEndDate && recurringEndDate && { end_date: recurringEndDate }),
            });
          } catch {
            // Non-fatal
          }
        }

        isDirtyRef.current = false;
        showToast('Income updated', 'success');
        navigation.goBack();
      } else {
        if (!isOnline()) {
          await enqueue({ type: 'income', payload });
          showToast('Saved offline — will sync when connected', 'info', 3000);
          isDirtyRef.current = false;
          navigation.replace(SCREEN_NAMES.SUCCESS, {
            type: 'income_logged',
            data: {
              merchant: values.source_name || values.description,
              amount: values.amount,
              category: selectedCategoryObj?.name || 'Other',
              date: 'Pending sync',
            },
          });
          return;
        }

        await txnService.createIncome(payload);

        if (isRecurring) {
          try {
            await txnService.createRecurringTransaction({
              type: 'income',
              amount: payload.amount,
              currency: 'NPR',
              description: values.description || '',
              source_name: values.source_name || '',
              frequency: effectiveFreq,
              next_occurrence: values.date,
              ...(selectedCategory && { category_id: selectedCategory }),
              ...(hasEndDate && recurringEndDate && { end_date: recurringEndDate }),
            });
          } catch {
            // Non-fatal
          }
        }

        isDirtyRef.current = false;
        navigation.replace(SCREEN_NAMES.SUCCESS, {
          type: 'income_logged',
          data: {
            merchant: values.source_name || values.description,
            amount: values.amount,
            category: selectedCategoryObj?.name || 'Other',
            date: `Today · ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          },
        });
      }
    } catch (error) {
      if (!isOnline() || error?.message?.includes('Network Error')) {
        showToast('Saved offline — will sync when connected', 'info', 3000);
        isDirtyRef.current = false;
        navigation.goBack();
        return;
      }
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.amount?.[0] ||
        error?.response?.data?.source_name?.[0] ||
        'Failed to save income. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Income' : 'Add Income'}</Text>
          <TouchableOpacity
            style={styles.headerSaveBtn}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.headerSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type Switcher */}
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={styles.typeBtn}
              onPress={() => {
                if (isEdit) {
                  showToast('Cannot change type while editing', 'info');
                } else {
                  navigation.replace(SCREEN_NAMES.ADD_EXPENSE);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.typeBtnText}>Expense</Text>
            </TouchableOpacity>
            <View style={[styles.typeBtn, styles.typeBtnActive]}>
              <Text style={styles.typeBtnTextActive}>Income</Text>
            </View>
          </View>

          {/* Amount Card */}
          <View style={styles.amountCard}>
            <Text style={styles.amountCardLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountCurrency}>Rs</Text>
              <Controller
                control={control}
                name="amount"
                rules={{
                  required: 'Amount is required',
                  validate: (v) => Number(v) > 0 || 'Must be greater than 0',
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.amountInput}
                    value={value}
                    onChangeText={(v) => { onChange(v); markDirty(); }}
                    placeholder="0.00"
                    placeholderTextColor={colors.primary[300]}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                )}
              />
            </View>
            {errors.amount && (
              <Text style={styles.errorText}>{errors.amount.message}</Text>
            )}
          </View>

          {/* Category */}
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.sectionIconBg,
              selectedCategoryObj && { backgroundColor: selectedCategoryObj.color + '20' },
            ]}>
              <MaterialIcons
                name={selectedCategoryObj ? (CATEGORY_ICONS[selectedCategoryObj.name] || 'label') : 'label-outline'}
                size={20}
                color={selectedCategoryObj?.color || colors.primary[400]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionCardLabel}>Category</Text>
              <Text style={[
                styles.sectionCardValue,
                !selectedCategoryObj && styles.sectionCardPlaceholder,
              ]}>
                {selectedCategoryObj?.name || 'Select category'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
          </TouchableOpacity>

          {/* Details Card: Source / Description / Date */}
          <View style={styles.fieldsCard}>
            {/* Source */}
            <Controller
              control={control}
              name="source_name"
              rules={{ required: 'Source is required' }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldRow}>
                  <MaterialIcons name="account-balance" size={20} color={colors.primary[400]} style={styles.fieldIcon} />
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>Source *</Text>
                    <TextInput
                      style={[styles.fieldInput, errors.source_name && { color: colors.danger[500] }]}
                      value={value}
                      onChangeText={(v) => { onChange(v); markDirty(); }}
                      placeholder="e.g. Salary, Freelance, Investment"
                      placeholderTextColor={colors.primary[300]}
                      returnKeyType="next"
                    />
                    {errors.source_name && (
                      <Text style={styles.inlineError}>{errors.source_name.message}</Text>
                    )}
                  </View>
                </View>
              )}
            />
            {/* Description */}
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.fieldRow, styles.fieldRowBorder]}>
                  <MaterialIcons name="notes" size={20} color={colors.primary[400]} style={styles.fieldIcon} />
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>Description (optional)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={value}
                      onChangeText={(v) => { onChange(v); markDirty(); }}
                      placeholder="Any details about this income"
                      placeholderTextColor={colors.primary[300]}
                      returnKeyType="next"
                    />
                  </View>
                </View>
              )}
            />
            {/* Date */}
            <TouchableOpacity
              style={[styles.fieldRow, styles.fieldRowBorder]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="calendar-today" size={20} color={colors.primary[400]} style={styles.fieldIcon} />
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Date</Text>
                <Text style={styles.fieldValue}>{formatDisplayDate(watchedDate)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View style={styles.fieldsCard}>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldRow}>
                  <MaterialIcons name="sticky-note-2" size={20} color={colors.primary[400]} style={styles.fieldIcon} />
                  <View style={styles.fieldContent}>
                    <Text style={styles.fieldLabel}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.fieldInput, styles.notesInput]}
                      value={value}
                      onChangeText={(v) => { onChange(v); markDirty(); }}
                      placeholder="Any additional notes..."
                      placeholderTextColor={colors.primary[300]}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}
            />
          </View>

          {/* Recurring */}
          <View style={styles.fieldsCard}>
            <View style={styles.recurringRow}>
              <View style={styles.recurringLeft}>
                <View style={styles.recurringIconBg}>
                  <MaterialIcons name="repeat" size={18} color={colors.primary[600]} />
                </View>
                <View>
                  <Text style={styles.recurringTitle}>Recurring</Text>
                  {isRecurring && (
                    <Text style={styles.recurringSubLabel}>{getRecurringLabel()}</Text>
                  )}
                </View>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={(v) => { setIsRecurring(v); markDirty(); }}
                trackColor={{ false: colors.primary[200], true: colors.accent[200] }}
                thumbColor={isRecurring ? colors.accent[600] : colors.primary[400]}
              />
            </View>

            {isRecurring && (
              <View style={styles.recurringExpanded}>
                <Text style={styles.recurringFreqTitle}>Repeat every</Text>
                <View style={styles.recurringChipsRow}>
                  {QUICK_RECURRING.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.recurringChip, recurringFreq === opt.key && styles.recurringChipActive]}
                      onPress={() => { setRecurringFreq(opt.key); markDirty(); }}
                    >
                      <Text style={[styles.recurringChipText, recurringFreq === opt.key && styles.recurringChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {recurringFreq === 'custom' && (
                  <View style={styles.customFreqSection}>
                    <Text style={styles.recurringFreqTitle}>Frequency</Text>
                    <View style={styles.customFreqWrap}>
                      {CUSTOM_FREQUENCIES.map((opt) => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.customFreqChip, customFreq === opt.key && styles.recurringChipActive]}
                          onPress={() => { setCustomFreq(opt.key); markDirty(); }}
                        >
                          <Text style={[styles.recurringChipText, customFreq === opt.key && styles.recurringChipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.endDateToggleRow}>
                      <Text style={styles.endDateLabel}>Set end date</Text>
                      <Switch
                        value={hasEndDate}
                        onValueChange={(v) => { setHasEndDate(v); markDirty(); }}
                        trackColor={{ false: colors.primary[200], true: colors.accent[200] }}
                        thumbColor={hasEndDate ? colors.accent[600] : colors.primary[400]}
                      />
                    </View>

                    {hasEndDate && (
                      <TouchableOpacity
                        style={styles.endDatePickerRow}
                        onPress={() => setShowEndDatePicker(true)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="event" size={18} color={colors.primary[600]} />
                        <Text style={styles.endDatePickerText}>
                          {recurringEndDate ? formatDisplayDate(recurringEndDate) : 'Pick end date'}
                        </Text>
                        <MaterialIcons name="chevron-right" size={18} color={colors.primary[400]} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>


      </KeyboardAvoidingView>

      {/* Category Modal (2-column grid) */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCategoryModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={22} color={colors.primary[600]} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.catGrid}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const iconName = CATEGORY_ICONS[cat.name] || 'label';
                  return (
                    <View key={cat.id} style={styles.catGridItemOuter}>
                      <TouchableOpacity
                        style={[
                          styles.catGridItemInner,
                          isSelected && { borderColor: cat.color, backgroundColor: cat.color + '15' },
                        ]}
                        onPress={() => {
                          setSelectedCategory(isSelected ? null : cat.id);
                          setShowCategoryModal(false);
                          markDirty();
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.catGridIconBg, { backgroundColor: cat.color + '20' }]}>
                          <MaterialIcons name={iconName} size={22} color={cat.color} />
                        </View>
                        <Text style={[styles.catGridName, isSelected && { color: cat.color, fontWeight: '700' }]}>
                          {cat.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.catCheckWrap}>
                            <MaterialIcons name="check-circle" size={16} color={cat.color} />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              {selectedCategory && (
                <TouchableOpacity
                  style={styles.clearCatBtn}
                  onPress={() => { setSelectedCategory(null); setShowCategoryModal(false); markDirty(); }}
                >
                  <Text style={styles.clearCatText}>Clear selection</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: spacing.lg }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <CalendarPickerModal
        visible={showDatePicker}
        initialDate={watchedDate ? new Date(watchedDate + 'T00:00:00') : new Date()}
        onClose={() => setShowDatePicker(false)}
        onPick={(d) => {
          setValue('date', format(d, 'yyyy-MM-dd'));
          setShowDatePicker(false);
          markDirty();
        }}
        title="Select Date"
        accentColor={colors.accent[500]}
      />

      {/* End Date Picker */}
      <CalendarPickerModal
        visible={showEndDatePicker}
        initialDate={recurringEndDate ? new Date(recurringEndDate + 'T00:00:00') : new Date()}
        onClose={() => setShowEndDatePicker(false)}
        onPick={(d) => {
          setRecurringEndDate(format(d, 'yyyy-MM-dd'));
          setShowEndDatePicker(false);
          markDirty();
        }}
        title="Select End Date"
        accentColor={colors.accent[500]}
      />
    </SafeAreaView>
  );
}

/* Calendar Picker */
function CalendarPickerModal({ visible, initialDate, onClose, onPick, title, accentColor }) {
  const accent = accentColor || colors.accent[500];

  const safeInit = useMemo(() => {
    if (!initialDate || isNaN(new Date(initialDate).getTime())) return new Date();
    return new Date(initialDate);
  }, [initialDate]);

  const [viewMonth, setViewMonth] = useState(safeInit);

  useEffect(() => {
    if (visible) setViewMonth(safeInit);
  }, [visible, safeInit]);

  const { cells } = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const c = [];
    let cursor = gridStart;
    for (let i = 0; i < 42; i++) {
      c.push(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    return { cells: c };
  }, [viewMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cal.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
            {cells.map((d, idx) => {
              const inMonth = isSameMonth(d, viewMonth);
              const isToday = isSameDay(d, new Date());
              const isSelected = isSameDay(d, safeInit);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[cal.dayCell, isSelected && { backgroundColor: accent }]}
                  onPress={() => onPick(d)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    cal.dayText,
                    !inMonth && cal.dayTextOutMonth,
                    isToday && !isSelected && { color: accent, fontWeight: '700' },
                    isSelected && cal.dayTextSelected,
                  ]}>
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={cal.cancelBtn} onPress={onClose}>
            <Text style={cal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3 },
  headerSaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.accent[600],
    borderRadius: borderRadius.md,
  },
  headerSaveBtnText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },

  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Type Switcher
  typeSwitcher: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[100],
  },
  typeBtnActive: {
    backgroundColor: colors.accent[600],
  },
  typeBtnText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[800],
  },
  typeBtnTextActive: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  // Amount Card
  amountCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  amountCardLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amountCurrency: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent[500],
    lineHeight: 48,
  },
  amountInput: {
    flex: 1,
    fontSize: 42,
    fontWeight: '700',
    color: colors.primary[800],
    padding: 0,
    letterSpacing: -1,
    lineHeight: 52,
    includeFontPadding: false,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger[500],
    marginTop: spacing.xs,
  },

  // Section Card (category)
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing.sm,
    ...shadow.sm,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardLabel: {
    ...typography.caption,
    color: colors.primary[500],
    fontWeight: '600',
  },
  sectionCardValue: {
    ...typography.body,
    color: colors.primary[800],
    fontWeight: '600',
    marginTop: 1,
    fontSize: 15,
  },
  sectionCardPlaceholder: {
    color: colors.primary[400],
    fontWeight: '400',
  },

  // Fields Card
  fieldsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
    overflow: 'hidden',
    ...shadow.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  fieldRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
  },
  fieldIcon: {
    marginTop: 18,
  },
  fieldContent: { flex: 1 },
  fieldLabel: {
    ...typography.caption,
    color: colors.primary[500],
    fontWeight: '600',
    marginBottom: 2,
  },
  fieldInput: {
    ...typography.body,
    color: colors.primary[800],
    padding: 0,
    fontSize: 15,
    minHeight: 28,
  },
  fieldValue: {
    ...typography.body,
    color: colors.primary[800],
    fontSize: 15,
    paddingVertical: 2,
  },
  notesInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  inlineError: {
    ...typography.caption,
    color: colors.danger[500],
    marginTop: 2,
  },

  // Recurring
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  recurringLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recurringIconBg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary[800],
    fontSize: 15,
  },
  recurringSubLabel: {
    ...typography.caption,
    color: colors.primary[500],
    marginTop: 1,
  },
  recurringExpanded: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
  },
  recurringFreqTitle: {
    ...typography.caption,
    color: colors.primary[500],
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  recurringChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recurringChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    backgroundColor: colors.white,
  },
  recurringChipActive: {
    borderColor: colors.accent[500],
    backgroundColor: colors.accent[50],
  },
  recurringChipText: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  recurringChipTextActive: {
    color: colors.accent[700],
    fontWeight: '700',
  },
  customFreqSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
  },
  customFreqWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  customFreqChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    backgroundColor: colors.white,
  },
  endDateToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  endDateLabel: {
    ...typography.body,
    color: colors.primary[700],
    fontWeight: '500',
    fontSize: 14,
  },
  endDatePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  endDatePickerText: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.primary[700],
  },

  // Footer
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
    ...shadow.md,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.primary[600],
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.accent[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '700',
  },

  // Category Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxHeight: '78%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[200],
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h3 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category 2-column grid
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  catGridItemOuter: {
    width: '50%',
    padding: spacing.xs,
  },
  catGridItemInner: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    padding: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    position: 'relative',
  },
  catGridIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catGridName: {
    ...typography.caption,
    color: colors.primary[700],
    fontWeight: '600',
    textAlign: 'left',
    fontSize: 12,
    flex: 1,
  },
  catCheckWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  clearCatBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
  },
  clearCatText: {
    ...typography.body,
    color: colors.danger[500],
    fontWeight: '600',
    fontSize: 14,
  },
});

/* Calendar Styles */
const cal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
  },
  monthLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary[800],
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[400],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-center',
    justifyContent: 'center',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[700],
  },
  dayTextOutMonth: { color: colors.primary[300] },
  dayTextSelected: { color: colors.white, fontWeight: '600' },
  cancelBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.body,
    color: colors.primary[500],
    fontSize: 15,
  },
});

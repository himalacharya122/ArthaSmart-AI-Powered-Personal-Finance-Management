import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { CATEGORY_ICONS, SCREEN_NAMES } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { isOnline, enqueue } from '../../services/offline';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ConfirmModal } from '../../components/common/Modal';

const RECURRING_OPTIONS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom' },
];

export function AddIncomeScreen({ navigation, route }) {
  const editData = route?.params?.income;
  const isEdit = !!editData;

  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(editData?.category?.id || null);

  // AI suggestion
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState('monthly');

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: editData?.amount || '',
      source_name: editData?.source_name || '',
      description: editData?.description || '',
      notes: '',
      date: editData?.date || format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const watchSource = watch('source_name');
  const watchDesc = watch('description');

  useEffect(() => {
    txnService.getCategories('income').then((res) => {
      setCategories(res.results || []);
    }).catch(() => {});
  }, []);

  // AI category suggestion for income
  useEffect(() => {
    if (selectedCategory || categories.length === 0) {
      setAiSuggestion(null);
      return;
    }
    const text = `${watchSource} ${watchDesc}`.toLowerCase();
    if (text.trim().length < 3) { setAiSuggestion(null); return; }

    const keywords = {
      'Salary': ['salary', 'payroll', 'wage', 'pay'],
      'Freelance': ['freelance', 'gig', 'project', 'contract', 'client'],
      'Investment': ['investment', 'dividend', 'stock', 'interest', 'return', 'profit'],
      'Gift': ['gift', 'present', 'received', 'birthday'],
    };

    for (const [catName, kws] of Object.entries(keywords)) {
      if (kws.some((kw) => text.includes(kw))) {
        const match = categories.find((c) => c.name === catName);
        if (match) {
          setAiSuggestion(match);
          return;
        }
      }
    }
    setAiSuggestion(null);
  }, [watchSource, watchDesc, categories, selectedCategory]);

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.id === selectedCategory),
    [categories, selectedCategory]
  );

  const handleConfirm = (values) => {
    setFormData(values);
    setShowConfirm(true);
  };

  const onSubmit = async () => {
    if (!formData) return;
    setLoading(true);
    try {
      const payload = {
        amount: formData.amount,
        source_name: formData.source_name,
        description: formData.description,
        date: formData.date,
        category_id: selectedCategory,
        currency: 'NPR',
      };

      if (isEdit) {
        await txnService.updateIncome(editData.id, payload);
        showToast('Income updated', 'success');
        setShowConfirm(false);
        navigation.goBack();
      } else {
        if (isOnline()) {
          await txnService.createIncome(payload);
        } else {
          await enqueue({ type: 'income', payload });
          showToast('Saved offline — will sync when connected', 'info', 3000);
        }
        setShowConfirm(false);
        navigation.replace(SCREEN_NAMES.SUCCESS, {
          type: 'income_logged',
          data: {
            merchant: formData.source_name || formData.description,
            amount: formData.amount,
            category: selectedCategoryObj?.name || 'Other',
            date: `Today · ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          },
        });
      }
    } catch (error) {
      if (!isOnline() || error?.message?.includes('Network Error')) {
        const payload = {
          amount: formData.amount,
          source_name: formData.source_name,
          description: formData.description,
          date: formData.date,
          category_id: selectedCategory,
          currency: 'NPR',
        };
        await enqueue({ type: 'income', payload });
        showToast('Saved offline — will sync when connected', 'info', 3000);
        setShowConfirm(false);
        navigation.replace(SCREEN_NAMES.SUCCESS, {
          type: 'income_logged',
          data: {
            merchant: formData.source_name || formData.description,
            amount: formData.amount,
            category: selectedCategoryObj?.name || 'Other',
            date: 'Pending sync',
          },
        });
        return;
      }
      const msg = error?.response?.data?.detail
        || error?.response?.data?.amount?.[0]
        || error?.response?.data?.source_name?.[0]
        || 'Failed to save income. Please try again.';
      showToast(msg, 'error');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Income' : 'Add Income'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Amount */}
          <Text style={styles.amountLabel}>Amount (NPR)</Text>
          <Controller
            control={control}
            name="amount"
            rules={{
              required: 'Amount is required',
              validate: (v) => Number(v) > 0 || 'Amount must be greater than 0',
            }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencySymbol}>Rs</Text>
                <Input
                  placeholder="0.00"
                  value={value}
                  onChangeText={onChange}
                  error={errors.amount?.message}
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                  inputStyle={styles.amountText}
                />
              </View>
            )}
          />

          {/* Category Picker */}
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryList}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const iconName = CATEGORY_ICONS[cat.name] || 'more-horiz';
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                >
                  <MaterialIcons name={iconName} size={16} color={isSelected ? cat.color : colors.primary[500]} />
                  <Text style={[styles.categoryChipText, isSelected && { color: cat.color, fontWeight: '600' }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* AI Suggestion */}
          {aiSuggestion && !selectedCategory && (
            <View style={styles.aiSuggestion}>
              <View style={styles.aiTag}>
                <MaterialIcons name="auto-awesome" size={12} color={colors.accent[600]} />
                <Text style={styles.aiTagText}>AI Suggestion</Text>
              </View>
              <View style={styles.aiContent}>
                <MaterialIcons name={CATEGORY_ICONS[aiSuggestion.name] || 'more-horiz'} size={18} color={aiSuggestion.color} />
                <Text style={styles.aiText}>Looks like <Text style={{ fontWeight: '600' }}>{aiSuggestion.name}</Text></Text>
                <TouchableOpacity
                  style={styles.aiAcceptBtn}
                  onPress={() => {
                    setSelectedCategory(aiSuggestion.id);
                    setAiSuggestion(null);
                  }}
                >
                  <Text style={styles.aiAcceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Source Name */}
          <Controller
            control={control}
            name="source_name"
            rules={{ required: 'Source is required' }}
            render={({ field: { onChange, value } }) => (
              <Input label="Source" placeholder="e.g., Salary, Freelance, Investment" value={value} onChangeText={onChange} error={errors.source_name?.message} leftIcon="account-balance" />
            )}
          />

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <Input label="Description (optional)" placeholder="Any details about this income" value={value} onChangeText={onChange} leftIcon="notes" />
            )}
          />

          {/* Date */}
          <Controller
            control={control}
            name="date"
            rules={{ required: 'Date is required' }}
            render={({ field: { onChange, value } }) => (
              <Input label="Date" placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} error={errors.date?.message} leftIcon="calendar-today" />
            )}
          />

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <Input label="Notes (optional)" placeholder="Any additional notes..." value={value} onChangeText={onChange} leftIcon="sticky-note-2" multiline numberOfLines={3} />
            )}
          />

          {/* Recurring Section */}
          <View style={styles.recurringHeader}>
            <View style={styles.recurringLeft}>
              <MaterialIcons name="repeat" size={20} color={colors.primary[600]} />
              <Text style={styles.recurringLabel}>Recurring</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.primary[200], true: colors.accent[200] }}
              thumbColor={isRecurring ? colors.accent[600] : colors.primary[400]}
            />
          </View>
          {isRecurring && (
            <View style={styles.recurringOptions}>
              {RECURRING_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.recurringChip, recurringFreq === opt.key && styles.recurringChipActive]}
                  onPress={() => setRecurringFreq(opt.key)}
                >
                  <Text style={[styles.recurringChipText, recurringFreq === opt.key && styles.recurringChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="outline"
              size="lg"
              style={styles.actionBtnHalf}
            />
            <Button
              title={isEdit ? 'Update Income' : 'Add Income'}
              onPress={handleSubmit(handleConfirm)}
              variant="accent"
              size="lg"
              style={styles.actionBtnHalf}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      {formData && (
        <ConfirmModal
          visible={showConfirm}
          title={isEdit ? 'Update Income?' : 'Confirm Income'}
          message={`Amount: ${formatCurrency(formData.amount)}\nCategory: ${selectedCategoryObj?.name || 'None'}\nSource: ${formData.source_name}\nDate: ${formData.date}${formData.description ? `\nDescription: ${formData.description}` : ''}`}
          confirmTitle={isEdit ? 'Update' : 'Add Income'}
          confirmVariant="accent"
          icon="account-balance-wallet"
          iconColor={colors.accent[600]}
          onConfirm={onSubmit}
          onCancel={() => setShowConfirm(false)}
          loading={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.primary[100],
  },
  backBtn: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl + 20 },
  amountLabel: { ...typography.label, marginBottom: spacing.xs },
  amountInputWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  currencySymbol: { ...typography.h2, color: colors.primary[400], marginRight: spacing.sm, marginTop: spacing.sm + 6 },
  amountInput: { flex: 1, marginBottom: 0 },
  amountText: { fontSize: 24, fontWeight: '700' },
  label: { ...typography.label, marginBottom: spacing.sm },
  categoryScroll: { marginBottom: spacing.xs },
  categoryList: { gap: spacing.sm, paddingRight: spacing.md },
  categoryChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary[200], borderRadius: borderRadius.full, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm + 4, gap: 4 },
  categoryChipText: { ...typography.caption, color: colors.primary[600], fontWeight: '500' },

  // AI suggestion
  aiSuggestion: { backgroundColor: colors.accent[50], borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.accent[200] },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  aiTagText: { fontSize: 10, fontWeight: '700', color: colors.accent[600], textTransform: 'uppercase', letterSpacing: 0.5 },
  aiContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiText: { ...typography.bodySmall, color: colors.primary[700], flex: 1 },
  aiAcceptBtn: { backgroundColor: colors.accent[600], borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  aiAcceptText: { color: colors.white, fontSize: 12, fontWeight: '600' },

  // Recurring
  recurringHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, marginTop: spacing.xs },
  recurringLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recurringLabel: { ...typography.body, fontWeight: '500', color: colors.primary[700] },
  recurringOptions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  recurringChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary[200] },
  recurringChipActive: { borderColor: colors.accent[500], backgroundColor: colors.accent[50] },
  recurringChipText: { ...typography.bodySmall, color: colors.primary[500], fontWeight: '500' },
  recurringChipTextActive: { color: colors.accent[700], fontWeight: '600' },

  // Actions
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtnHalf: { flex: 1 },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { CATEGORY_ICONS } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export function AddIncomeScreen({ navigation, route }) {
  const editData = route?.params?.income;
  const isEdit = !!editData;

  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(editData?.category?.id || null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: editData?.amount || '',
      source_name: editData?.source_name || '',
      description: editData?.description || '',
      date: editData?.date || format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    txnService.getCategories('income').then((res) => {
      setCategories(res.results || []);
    }).catch(() => {});
  }, []);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        amount: values.amount,
        source_name: values.source_name,
        description: values.description,
        date: values.date,
        category_id: selectedCategory,
        currency: 'NPR',
      };

      if (isEdit) {
        await txnService.updateIncome(editData.id, payload);
        showToast('Income updated', 'success');
      } else {
        await txnService.createIncome(payload);
        showToast('Income added', 'success');
      }
      navigation.goBack();
    } catch (error) {
      const msg = error?.response?.data?.detail
        || error?.response?.data?.amount?.[0]
        || error?.response?.data?.source_name?.[0]
        || 'Failed to save income. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Income' : 'Add Income'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryList}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const iconName = CATEGORY_ICONS[cat.name] || 'more-horiz';
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isSelected && { borderColor: cat.color, backgroundColor: cat.color + '15' },
                  ]}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                >
                  <MaterialIcons name={iconName} size={16} color={isSelected ? cat.color : colors.primary[500]} />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && { color: cat.color, fontWeight: '600' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Source Name */}
          <Controller
            control={control}
            name="source_name"
            rules={{ required: 'Source is required' }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="Source"
                placeholder="e.g., Salary, Freelance, Investment"
                value={value}
                onChangeText={onChange}
                error={errors.source_name?.message}
                leftIcon="account-balance"
              />
            )}
          />

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Description (optional)"
                placeholder="Any notes about this income"
                value={value}
                onChangeText={onChange}
                leftIcon="notes"
              />
            )}
          />

          {/* Date */}
          <Controller
            control={control}
            name="date"
            rules={{ required: 'Date is required' }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="Date"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                error={errors.date?.message}
                leftIcon="calendar-today"
              />
            )}
          />

          {/* Submit */}
          <Button
            title={isEdit ? 'Update Income' : 'Add Income'}
            onPress={handleSubmit(onSubmit)}
            variant="accent"
            size="lg"
            fullWidth
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  headerTitle: {
    ...typography.h3,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  amountLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  currencySymbol: {
    ...typography.h2,
    color: colors.primary[400],
    marginRight: spacing.sm,
    marginTop: spacing.sm + 6,
  },
  amountInput: {
    flex: 1,
    marginBottom: 0,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryList: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    gap: 4,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: spacing.lg,
  },
});

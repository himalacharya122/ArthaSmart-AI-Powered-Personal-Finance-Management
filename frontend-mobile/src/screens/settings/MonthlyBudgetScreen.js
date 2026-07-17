import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  KeyboardAvoidingView,
  UIManager,
  InputAccessoryView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import * as authService from '../../services/auth';
import * as txnService from '../../services/transactions';
import { storage } from '../../utils/storage';
import {
  getCurrentBudgetPeriod,
  toApiDate,
  formatPeriodRange,
  formatResetDay,
} from '../../utils/budget';
import { SCREEN_NAMES } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CURRENCY_SYMBOLS = { NPR: 'Rs', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[code] || code || 'Rs';
const ACCESSORY_ID = 'monthly-budget-accessory';

export function MonthlyBudgetScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useAppStore((s) => s.showToast);
  const symbol = getCurrencySymbol(user?.preferred_currency);

  const [spendingBudget, setSpendingBudget] = useState(null); // number | null
  const [incomeGoal, setIncomeGoal] = useState(
    user?.monthly_income_goal != null ? Number(user.monthly_income_goal) : null
  );
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState(null);
  const [resetDay, setResetDay] = useState(1);
  const [spent, setSpent] = useState(0);
  const [budgetedCategoryCount, setBudgetedCategoryCount] = useState(0);

  // Inline Edit state
  const [editing, setEditing] = useState(null); // 'budget' | 'income' | null
  const [draft, setDraft] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  const inputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mb, p, day, catBudgets] = await Promise.all([
        storage.getMonthlyBudget(),
        getCurrentBudgetPeriod(),
        storage.getBudgetResetDay(),
        storage.getCategoryBudgets(),
      ]);
      setSpendingBudget(mb);
      setPeriod(p);
      setResetDay(day);
      setBudgetedCategoryCount(
        Object.values(catBudgets).filter((v) => Number(v) > 0).length
      );

      const expRes = await txnService.getExpenses({
        date_after: toApiDate(p.start),
        date_before: toApiDate(p.end),
        page_size: 500,
      });
      const expenses = expRes.results || expRes || [];
      const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      setSpent(total);
    } catch {
      // soft-fail
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleEditor = (which) => {
    // Smoother layout animation config
    LayoutAnimation.configureNext({
      duration: 250,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.opacity, duration: 100 },
    });

    if (editing === which) {
      setEditing(null);
      setDraft('');
    } else {
      setEditing(which);
      if (which === 'budget') {
        setDraft(spendingBudget != null ? String(spendingBudget) : '');
      } else {
        setDraft(incomeGoal != null ? String(incomeGoal) : '');
      }
      // Delay focus to let animation settle
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  };

  const handleDraftChange = (val) => {
    setDraft(val.replace(/[^0-9.]/g, ''));
  };

  const saveDraft = async () => {
    const parsed = draft.trim() === '' ? null : parseFloat(draft);
    if (parsed != null && (isNaN(parsed) || parsed < 0)) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    setSavingDraft(true);
    try {
      if (editing === 'budget') {
        await storage.setMonthlyBudget(parsed);
        setSpendingBudget(parsed);
        showToast('Spending budget saved', 'success');
      } else if (editing === 'income') {
        await authService.updateProfile({ monthly_income_goal: parsed });
        setIncomeGoal(parsed);
        if (setUser) setUser({ ...user, monthly_income_goal: parsed });
        showToast('Income goal saved', 'success');
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditing(null);
      setDraft('');
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const hasBudget = spendingBudget != null && spendingBudget > 0;
  const remaining = hasBudget ? spendingBudget - spent : 0;
  const pct = hasBudget ? Math.min((spent / spendingBudget) * 100, 100) : 0;
  const over = hasBudget && spent > spendingBudget;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly Budget</Text>
        <View style={{ width: 40 }} />
      </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
          {loading ? (
            <View style={{ paddingVertical: spacing.xl }}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
            </View>
          ) : (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroHeaderRow}>
                  <Text style={styles.heroLabel}>THIS CYCLE</Text>
                  <Text style={styles.heroPeriod}>
                    {period ? formatPeriodRange(period.start, period.end) : ''}
                  </Text>
                </View>

                {hasBudget ? (
                  <>
                    <View style={styles.amountRow}>
                      <View>
                        <Text style={styles.amountSmall}>Spent</Text>
                        <Text style={styles.amountBig}>{formatCurrency(spent)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.amountSmall}>{over ? 'Over by' : 'Remaining'}</Text>
                        <Text
                          style={[
                            styles.amountBig,
                            { color: over ? colors.danger[600] : colors.accent[600] },
                          ]}
                        >
                          {formatCurrency(Math.abs(remaining))}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${pct}%`, backgroundColor: over ? colors.danger[500] : colors.accent[600] },
                        ]}
                      />
                    </View>
                    <Text style={styles.barFooter}>
                      of {formatCurrency(spendingBudget)} budgeted
                    </Text>
                  </>
                ) : (
                  <Text style={styles.heroEmpty}>
                    Tap "Monthly spending limit" below to start tracking your budget.
                  </Text>
                )}
              </View>

              <Text style={styles.sectionLabel}>SPENDING BUDGET</Text>
              <View style={styles.cardGroup}>
                <InlineValueRow
                  icon="account-balance-wallet"
                  label="Monthly spending limit"
                  value={
                    spendingBudget != null
                      ? `${symbol} ${Number(spendingBudget).toLocaleString()}`
                      : 'Not set'
                  }
                  placeholder={spendingBudget == null}
                  isEditing={editing === 'budget'}
                  onPress={() => toggleEditor('budget')}
                  draft={draft}
                  onDraftChange={handleDraftChange}
                  onSave={saveDraft}
                  onCancel={() => toggleEditor('budget')}
                  saving={savingDraft}
                  symbol={symbol}
                  inputRef={inputRef}
                />
                <TouchableOpacity
                  style={styles.valueRow}
                  onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_BUDGETS)}
                  activeOpacity={0.6}
                >
                  <View style={styles.valueRowIconBg}>
                    <MaterialIcons name="pie-chart" size={18} color={colors.primary[600]} />
                  </View>
                  <Text style={[styles.valueRowLabel, { flex: 1 }]}>Budgets per category</Text>
                  <Text style={[styles.valueRowValue, budgetedCategoryCount === 0 && styles.valueRowPlaceholder]}>
                    {budgetedCategoryCount > 0 ? `${budgetedCategoryCount} set` : 'Optional'}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.primary[500]} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>INCOME GOAL</Text>
              <View style={styles.cardGroup}>
                <InlineValueRow
                  icon="trending-up"
                  label="Monthly income target"
                  value={
                    incomeGoal != null
                      ? `${symbol} ${Number(incomeGoal).toLocaleString()}`
                      : 'Not set'
                  }
                  placeholder={incomeGoal == null}
                  isEditing={editing === 'income'}
                  onPress={() => toggleEditor('income')}
                  draft={draft}
                  onDraftChange={handleDraftChange}
                  onSave={saveDraft}
                  onCancel={() => toggleEditor('income')}
                  saving={savingDraft}
                  symbol={symbol}
                  inputRef={inputRef}
                />
              </View>

              <View style={styles.infoCard}>
                <MaterialIcons name="info-outline" size={18} color={colors.primary[500]} />
                <Text style={styles.infoText}>
                  Your budget cycle resets on the {formatResetDay(resetDay)}. Change it in
                  Settings → Budget reset day.
                </Text>
              </View>

              <View style={{ height: spacing.xxl }} />
            </>
          )}
          <View style={{ height: editing ? 300 : spacing.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View style={{ height: 0 }} />
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
}

function InlineValueRow({
  icon, label, value, placeholder, isEditing, onPress,
  draft, onDraftChange, onSave, onCancel, saving, symbol, inputRef
}) {
  return (
    <View style={styles.inlineRowContainer}>
      <TouchableOpacity
        style={[styles.valueRow, isEditing && styles.valueRowEditing]}
        onPress={onPress}
        activeOpacity={0.6}
        disabled={saving}
      >
        <View style={styles.valueRowIconBg}>
          <MaterialIcons name={icon} size={18} color={colors.primary[600]} />
        </View>
        <View style={{ flex: 1, height: 32, justifyContent: 'center' }}>
          <Text style={styles.valueRowLabel}>{label}</Text>
          {!isEditing && (
            <Text style={[styles.valueRowValue, placeholder && styles.valueRowPlaceholder]}>
              {value}
            </Text>
          )}
        </View>
        {!isEditing && (
          <MaterialIcons name="edit" size={18} color={colors.primary[500]} />
        )}
      </TouchableOpacity>

      {isEditing && (
        <View style={styles.editSection}>
          <View style={styles.inputWrapper}>
            <View style={styles.currencyPrefix}>
              <Text style={styles.currencyText}>{symbol}</Text>
            </View>
            <TextInput
              ref={inputRef}
              style={styles.inlineInput}
              value={draft}
              onChangeText={onDraftChange}
              placeholder="0"
              placeholderTextColor={colors.primary[400]}
              keyboardType="decimal-pad"
              returnKeyType="done"
              autoFocus={false}
              selectTextOnFocus={false}
              inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
              onSubmitEditing={onSave}
              editable={!saving}
            />
          </View>

          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

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
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },

  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: spacing.lg,
  },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm + 2 },
  heroLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[500] },
  heroPeriod: { ...typography.caption, color: colors.primary[600], fontWeight: '600' },
  heroEmpty: { ...typography.bodySmall, color: colors.primary[500], lineHeight: 19 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.sm + 2 },
  amountSmall: { ...typography.caption, color: colors.primary[500], fontWeight: '500' },
  amountBig: { ...typography.h2, fontSize: 22, color: colors.primary[800], marginTop: 2 },
  barBg: { height: 8, borderRadius: 4, backgroundColor: colors.primary[100], overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barFooter: { ...typography.caption, color: colors.primary[500], marginTop: spacing.xs + 2, textAlign: 'right' },

  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: spacing.sm,
  },
  cardGroup: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    overflow: 'hidden',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[50],
  },
  valueRowEditing: {
    backgroundColor: colors.primary[50],
    borderBottomWidth: 0,
  },
  valueRowIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  valueRowLabel: { ...typography.body, fontSize: 13, color: colors.primary[500], fontWeight: '600' },
  valueRowValue: { ...typography.body, fontSize: 15, fontWeight: '700', color: colors.primary[800], marginTop: 1 },
  valueRowPlaceholder: { color: colors.primary[300], fontWeight: '500' },

  inlineRowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[50],
  },
  editSection: {
    padding: spacing.md,
    paddingTop: 0,
    backgroundColor: colors.primary[50],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
    height: 48,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  currencyPrefix: {
    paddingHorizontal: spacing.md,
    height: '100%',
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.primary[100],
  },
  currencyText: { ...typography.body, fontWeight: '700', color: colors.primary[600] },
  inlineInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[800],
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  saveBtn: {
    backgroundColor: colors.primary[800],
  },
  cancelBtnText: { color: colors.primary[600], fontWeight: '600', fontSize: 14 },
  saveBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },

  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  infoText: { ...typography.caption, color: colors.primary[600], flex: 1, lineHeight: 17, fontWeight: '500' },
});

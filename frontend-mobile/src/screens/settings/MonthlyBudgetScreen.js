import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  InputAccessoryView,
} from 'react-native';
import { BottomSheet } from '../../components/common/BottomSheet';

const NUMERIC_ACCESSORY_ID = 'mb-empty-bar';
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

const CURRENCY_SYMBOLS = { NPR: 'Rs', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[code] || code || 'Rs';

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

  // Edit modal state
  const [editing, setEditing] = useState(null); // 'budget' | 'income' | null
  const [draft, setDraft] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

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

  const openEditor = (which) => {
    setEditing(which);
    if (which === 'budget') {
      setDraft(spendingBudget != null ? String(spendingBudget) : '');
    } else {
      setDraft(incomeGoal != null ? String(incomeGoal) : '');
    }
  };

  const closeEditor = () => {
    setEditing(null);
    setDraft('');
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
      closeEditor();
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

  const editorTitle =
    editing === 'budget' ? 'Monthly spending limit' :
    editing === 'income' ? 'Monthly income goal' : '';
  const editorHint =
    editing === 'budget' ? 'The maximum total you want to spend each cycle.' :
    editing === 'income' ? 'Used to compute your savings rate on the dashboard.' : '';
  const editorIcon = editing === 'budget' ? 'account-balance-wallet' : 'trending-up';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly Budget</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
              <ValueRow
                icon="account-balance-wallet"
                label="Monthly spending limit"
                value={
                  spendingBudget != null
                    ? `${symbol} ${Number(spendingBudget).toLocaleString()}`
                    : 'Not set'
                }
                placeholder={spendingBudget == null}
                onPress={() => openEditor('budget')}
              />
              <ValueRow
                icon="pie-chart"
                label="Category budgets"
                value={
                  budgetedCategoryCount > 0
                    ? `${budgetedCategoryCount} set`
                    : 'Optional'
                }
                placeholder={budgetedCategoryCount === 0}
                onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORY_BUDGETS)}
              />
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>INCOME GOAL</Text>
            <View style={styles.cardGroup}>
              <ValueRow
                icon="trending-up"
                label="Monthly income target"
                value={
                  incomeGoal != null
                    ? `${symbol} ${Number(incomeGoal).toLocaleString()}`
                    : 'Not set'
                }
                placeholder={incomeGoal == null}
                onPress={() => openEditor('income')}
              />
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="info-outline" size={18} color={colors.primary[500]} />
              <Text style={styles.infoText}>
                Your budget cycle resets on the {formatResetDay(resetDay)}. Change it in
                Settings → Budget reset day.
              </Text>
            </View>

            <View style={{ height: spacing.xl }} />
          </>
        )}
      </ScrollView>

      {/* Edit sheet — synchronized overlay + slide + keyboard */}
      <BottomSheet visible={editing !== null} onClose={closeEditor}>
        <View style={ms.sheet}>
          <View style={ms.handle} />

              <View style={ms.header}>
                <View style={ms.headerIcon}>
                  <MaterialIcons name={editorIcon} size={22} color={colors.primary[700]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ms.title}>{editorTitle}</Text>
                  <Text style={ms.subtitle}>Enter the amount in {symbol}</Text>
                </View>
                <TouchableOpacity onPress={closeEditor}>
                  <MaterialIcons name="close" size={22} color={colors.primary[400]} />
                </TouchableOpacity>
              </View>

              <View style={ms.inputRow}>
                <View style={ms.currencyPrefix}>
                  <Text style={ms.currencyText}>{symbol}</Text>
                </View>
                <TextInput
                  style={ms.input}
                  value={draft}
                  onChangeText={handleDraftChange}
                  placeholder="0"
                  placeholderTextColor={colors.primary[300]}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  autoFocus
                  selectTextOnFocus
                  includeFontPadding={false}
                  onSubmitEditing={saveDraft}
                  inputAccessoryViewID={Platform.OS === 'ios' ? NUMERIC_ACCESSORY_ID : undefined}
                />
              </View>
              {!!editorHint && <Text style={ms.hint}>{editorHint}</Text>}

              <TouchableOpacity
                style={[ms.saveBtn, savingDraft && { opacity: 0.7 }]}
                onPress={saveDraft}
                disabled={savingDraft}
                activeOpacity={0.85}
              >
                {savingDraft ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={ms.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
        </View>
      </BottomSheet>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={NUMERIC_ACCESSORY_ID}>
          <View style={{ height: 0 }} />
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
}

function ValueRow({ icon, label, value, placeholder, onPress }) {
  return (
    <TouchableOpacity style={styles.valueRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.valueRowIconBg}>
        <MaterialIcons name={icon} size={18} color={colors.primary[600]} />
      </View>
      <Text style={styles.valueRowLabel}>{label}</Text>
      <Text style={[styles.valueRowValue, placeholder && styles.valueRowPlaceholder]}>{value}</Text>
      <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
    </TouchableOpacity>
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
    backgroundColor: colors.white,
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
  amountSmall: { ...typography.caption, color: colors.primary[400], fontWeight: '500' },
  amountBig: { ...typography.h2, fontSize: 22, color: colors.primary[800], marginTop: 2 },
  barBg: { height: 8, borderRadius: 4, backgroundColor: colors.primary[100], overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barFooter: { ...typography.caption, color: colors.primary[400], marginTop: spacing.xs + 2, textAlign: 'right' },

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
  valueRowIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  valueRowLabel: { ...typography.body, fontSize: 14, color: colors.primary[700], flex: 1 },
  valueRowValue: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800], marginRight: spacing.xs },
  valueRowPlaceholder: { color: colors.primary[400], fontWeight: '500' },

  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  infoText: { ...typography.caption, color: colors.primary[600], flex: 1, lineHeight: 17 },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.primary[200], alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h3, color: colors.primary[800] },
  subtitle: { ...typography.caption, color: colors.primary[400], marginTop: 2 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  currencyPrefix: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.primary[100],
    borderRightWidth: 1,
    borderRightColor: colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  currencyText: { ...typography.body, fontWeight: '600', color: colors.primary[600] },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[800],
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 50,
  },
  hint: { ...typography.caption, color: colors.primary[500], lineHeight: 17, marginBottom: spacing.md },

  saveBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
});

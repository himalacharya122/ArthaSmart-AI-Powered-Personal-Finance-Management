import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  InputAccessoryView,
} from 'react-native';

const NUMERIC_ACCESSORY_ID = 'cb-empty-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { storage } from '../../utils/storage';
import { getCurrentBudgetPeriod, toApiDate, formatPeriodRange } from '../../utils/budget';
import * as txnService from '../../services/transactions';
import { CATEGORY_ICONS } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';

const CURRENCY_SYMBOLS = { NPR: 'Rs', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[code] || code || 'Rs';

export function CategoryBudgetsScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);
  const symbol = getCurrencySymbol(user?.preferred_currency);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({}); // { [id]: stringValue }
  const [spentByCat, setSpentByCat] = useState({}); // { [id]: number }
  const [overallBudget, setOverallBudget] = useState(null);
  const [period, setPeriod] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, savedBudgets, mb, p] = await Promise.all([
        txnService.getCategories('expense'),
        storage.getCategoryBudgets(),
        storage.getMonthlyBudget(),
        getCurrentBudgetPeriod(),
      ]);

      const cats = catsRes.results || catsRes || [];
      setCategories(cats);
      setOverallBudget(mb);
      setPeriod(p);

      const budgetStrings = {};
      cats.forEach((c) => {
        const v = savedBudgets[c.id];
        budgetStrings[c.id] = v != null ? String(v) : '';
      });
      setBudgets(budgetStrings);

      // Fetch expenses in current cycle and sum by category
      const expRes = await txnService.getExpenses({
        date_after: toApiDate(p.start),
        date_before: toApiDate(p.end),
        page_size: 500,
      });
      const expenses = expRes.results || expRes || [];
      const sums = {};
      expenses.forEach((e) => {
        const cid = e.category || e.category_id;
        if (cid == null) return;
        sums[cid] = (sums[cid] || 0) + Number(e.amount || 0);
      });
      setSpentByCat(sums);
    } catch {
      showToast('Failed to load category budgets', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (id, val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setBudgets((prev) => ({ ...prev, [id]: cleaned }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const map = {};
      Object.entries(budgets).forEach(([id, val]) => {
        const n = parseFloat(val);
        if (val !== '' && !isNaN(n) && n > 0) map[id] = n;
      });
      await storage.setCategoryBudgets(map);
      showToast('Category budgets saved!', 'success');
      navigation.goBack();
    } catch {
      showToast('Failed to save budgets', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalBudgeted = useMemo(() => {
    return Object.values(budgets).reduce((sum, v) => {
      const n = parseFloat(v);
      return !isNaN(n) ? sum + n : sum;
    }, 0);
  }, [budgets]);

  const overflow = overallBudget != null && totalBudgeted > overallBudget;
  const budgetedCount = Object.values(budgets).filter((v) => parseFloat(v) > 0).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Category budgets</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>This cycle</Text>
              <Text style={styles.heroPeriod}>
                {period ? formatPeriodRange(period.start, period.end) : ''}
              </Text>
              <View style={styles.heroDivider} />
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroSmall}>Budgeted</Text>
                  <Text style={styles.heroAmount}>{formatCurrency(totalBudgeted)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.heroSmall}>Overall cap</Text>
                  <Text style={styles.heroAmount}>
                    {overallBudget != null ? formatCurrency(overallBudget) : '—'}
                  </Text>
                </View>
              </View>
              {overflow && (
                <View style={styles.warnRow}>
                  <MaterialIcons name="warning-amber" size={16} color={colors.warning[600]} />
                  <Text style={styles.warnText}>
                    Category budgets exceed your overall monthly cap.
                  </Text>
                </View>
              )}
              <Text style={styles.heroHint}>
                {budgetedCount} of {categories.length} categories have a budget set.
                Leave blank to skip tracking that category.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>EXPENSE CATEGORIES</Text>

            {categories.map((cat) => {
              const id = cat.id;
              const spent = spentByCat[id] || 0;
              const budgetVal = parseFloat(budgets[id]);
              const hasBudget = !isNaN(budgetVal) && budgetVal > 0;
              const pct = hasBudget ? Math.min((spent / budgetVal) * 100, 100) : 0;
              const over = hasBudget && spent > budgetVal;

              return (
                <View key={id} style={styles.catCard}>
                  <View style={styles.catRow}>
                    <View style={styles.catIconBg}>
                      <MaterialIcons
                        name={CATEGORY_ICONS[cat.name] || 'label'}
                        size={18}
                        color={colors.primary[600]}
                      />
                    </View>
                    <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputSymbol}>{symbol}</Text>
                      <TextInput
                        style={styles.input}
                        value={budgets[id] || ''}
                        onChangeText={(v) => handleChange(id, v)}
                        placeholder="0"
                        placeholderTextColor={colors.primary[300]}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        includeFontPadding={false}
                        inputAccessoryViewID={Platform.OS === 'ios' ? NUMERIC_ACCESSORY_ID : undefined}
                      />
                    </View>
                  </View>

                  {hasBudget && (
                    <View style={styles.progressRow}>
                      <View style={styles.barBg}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct}%`, backgroundColor: over ? colors.danger[500] : colors.accent[600] },
                          ]}
                        />
                      </View>
                      <Text style={[styles.spentText, over && { color: colors.danger[600] }]}>
                        {formatCurrency(spent)} spent
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={{ height: spacing.md }} />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save category budgets</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={NUMERIC_ACCESSORY_ID}>
          <View style={{ height: 0 }} />
        </InputAccessoryView>
      )}
    </SafeAreaView>
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
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: spacing.lg,
  },
  heroLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[500], letterSpacing: 0.5 },
  heroPeriod: { ...typography.body, fontSize: 16, fontWeight: '600', color: colors.primary[800], marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: colors.primary[100], marginVertical: spacing.sm + 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroSmall: { ...typography.caption, color: colors.primary[400] },
  heroAmount: { ...typography.h3, fontSize: 18, color: colors.primary[800], marginTop: 2 },
  heroHint: { ...typography.caption, color: colors.primary[500], marginTop: spacing.sm + 2, lineHeight: 17 },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  warnText: { ...typography.caption, color: colors.warning[600], flex: 1, fontWeight: '500' },

  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  catCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginBottom: spacing.sm,
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catIconBg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { ...typography.body, fontSize: 14, color: colors.primary[800], flex: 1, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary[50],
    minWidth: 110,
    height: 38,
  },
  inputSymbol: { ...typography.caption, color: colors.primary[500], marginRight: 4, fontWeight: '600' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[800],
    padding: 0,
    textAlign: 'right',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingLeft: 36 + spacing.sm,
  },
  barBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[100],
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  spentText: { ...typography.caption, color: colors.primary[500], fontWeight: '500', minWidth: 90, textAlign: 'right' },

  saveBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
});

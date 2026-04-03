/**
 * SuccessScreen — Reusable success state screen.
 */
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { formatCurrency } from '../../utils/format';

const TYPE_CONFIG = {
  expense_logged: {
    icon: 'check',
    iconBg: colors.primary[800],
    iconColor: colors.white,
    title: 'Expense logged',
    subtitle: 'Added to your ledger and synced.',
    primaryBtn: 'Back to home',
    secondaryBtn: 'Add another expense',
    secondaryAction: 'add_expense',
  },
  income_logged: {
    icon: 'check',
    iconBg: colors.accent[600],
    iconColor: colors.white,
    title: 'Income logged',
    subtitle: 'Added to your ledger and synced.',
    primaryBtn: 'Back to home',
    secondaryBtn: 'Add another income',
    secondaryAction: 'add_income',
  },
  receipt_saved: {
    icon: 'receipt-long',
    iconBg: colors.primary[100],
    iconColor: colors.primary[500],
    badgeIcon: 'check-circle',
    title: 'Receipt saved',
    subtitle: 'Expense added to your ledger. Receipt stored and linked automatically.',
    primaryBtn: 'Back to home',
    secondaryBtn: 'Scan another receipt',
    secondaryAction: 'scan',
  },
  password_updated: {
    icon: 'lock',
    iconBg: colors.primary[800],
    iconColor: colors.white,
    title: 'Password updated',
    subtitle: 'Your new password is set. You\'ve been signed in on this device.',
    primaryBtn: 'Go to home',
    secondaryBtn: null,
    secondaryAction: null,
  },
};

export function SuccessScreen({ navigation, route }) {
  const { type = 'expense_logged', data = {} } = route.params || {};
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.expense_logged;

  // Entrance animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  // Build summary rows based on type
  const summaryRows = buildSummaryRows(type, data);

  const handlePrimary = () => {
    // Go back to root (home tab)
    navigation.popToTop();
    // If we're in a nested stack, also switch to home tab
    const parent = navigation.getParent();
    if (parent) parent.navigate('HomeTab');
  };

  const handleSecondary = () => {
    if (config.secondaryAction === 'add_expense') {
      navigation.popToTop();
      navigation.navigate('AddExpense');
    } else if (config.secondaryAction === 'add_income') {
      navigation.popToTop();
      navigation.navigate('AddIncome');
    } else if (config.secondaryAction === 'scan') {
      navigation.popToTop();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Icon */}
        <Animated.View style={[styles.iconOuter, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <MaterialIcons name={config.icon} size={36} color={config.iconColor} />
          </View>
          {config.badgeIcon && (
            <View style={styles.badgeIcon}>
              <MaterialIcons name={config.badgeIcon} size={22} color={colors.accent[600]} />
            </View>
          )}
        </Animated.View>

        {/* Title & Subtitle */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>
            {data.budgetPercent
              ? `${config.subtitle} Your ${data.category || 'food'} budget is now at ${data.budgetPercent}%.`
              : config.subtitle}
          </Text>
        </Animated.View>

        {/* Summary card */}
        {summaryRows.length > 0 && (
          <Animated.View style={[styles.summaryCard, { opacity: fadeAnim }]}>
            {summaryRows.map((row, i) => (
              <View
                key={row.label}
                style={[styles.summaryRow, i < summaryRows.length - 1 && styles.summaryRowBorder]}
              >
                <Text style={styles.summaryLabel}>{row.label}</Text>
                <Text style={[styles.summaryValue, row.bold && { fontWeight: '700' }]}>{row.value}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      {/* Bottom buttons */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={handlePrimary}>
          <Text style={styles.primaryBtnText}>{config.primaryBtn}</Text>
        </TouchableOpacity>
        {config.secondaryBtn && (
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={handleSecondary}>
            <Text style={styles.secondaryBtnText}>{config.secondaryBtn}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

function buildSummaryRows(type, data) {
  if (type === 'password_updated') return [];

  if (type === 'receipt_saved') {
    return [
      { label: 'Merchant', value: data.merchant || '—' },
      { label: 'Total', value: data.amount ? formatCurrency(data.amount) : '—', bold: true },
      { label: 'Items extracted', value: data.itemCount ? `${data.itemCount} items` : '—' },
      { label: 'Confidence', value: data.confidence ? `${Math.round(data.confidence)}%` : '—' },
    ].filter((r) => r.value !== '—');
  }

  // expense_logged or income_logged
  const rows = [];
  if (data.merchant || data.description) rows.push({ label: 'Merchant', value: data.merchant || data.description || '—' });
  if (data.amount) rows.push({ label: 'Amount', value: formatCurrency(data.amount), bold: true });
  if (data.category) rows.push({ label: 'Category', value: data.category });
  if (data.date) rows.push({ label: 'Date', value: data.date });
  return rows;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },

  // Icon
  iconOuter: { marginBottom: spacing.lg, position: 'relative' },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeIcon: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: colors.white, borderRadius: 12, padding: 2,
  },

  // Text
  title: { ...typography.h1, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: {
    ...typography.body, color: colors.primary[500], textAlign: 'center',
    maxWidth: 300, lineHeight: 22, marginBottom: spacing.lg,
  },

  // Summary card
  summaryCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, ...shadow.sm,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  summaryRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.primary[100] },
  summaryLabel: { ...typography.body, color: colors.primary[500], fontSize: 14 },
  summaryValue: { ...typography.body, fontWeight: '500', fontSize: 14, color: colors.primary[800] },

  // Footer
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  primaryBtn: {
    backgroundColor: colors.primary[800], borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
  },
  primaryBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
  secondaryBtn: {
    backgroundColor: colors.primary[100], borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  secondaryBtnText: { ...typography.button, color: colors.primary[600], fontSize: 15 },
});

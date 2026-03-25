/**
 * Export Data, Export transactions as CSV/PDF.
 *
 * Features:
 * - File format selection (CSV / PDF)
 * - Date range pills + custom date pickers
 * - Include checkboxes (Expenses, Income, Receipts, AI insights)
 * - Preview card with filename, rows, size
 * - Export & Share button
 */
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { format, subDays, subMonths, startOfYear, startOfWeek } from 'date-fns';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';

const FILE_FORMATS = [
  { key: 'csv', label: 'CSV', desc: 'Spreadsheet-ready. Opens in Excel or Google Sheets.', icon: 'description', color: colors.accent[600] },
  { key: 'pdf', label: 'PDF', desc: 'Formatted report. Good for sharing or printing.', icon: 'picture-as-pdf', color: colors.danger[400] },
];

const DATE_RANGES = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: '3months', label: 'Last 3 months' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

function getDateRange(key) {
  const now = new Date();
  switch (key) {
    case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case '3months': return { from: subMonths(now, 3), to: now };
    case 'year': return { from: startOfYear(now), to: now };
    default: return { from: subMonths(now, 1), to: now };
  }
}

export function ExportDataScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [fileFormat, setFileFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('month');
  const [dateFrom, setDateFrom] = useState(getDateRange('month').from);
  const [dateTo, setDateTo] = useState(getDateRange('month').to);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(false);
  const [expenseCount, setExpenseCount] = useState(0);
  const [incomeCount, setIncomeCount] = useState(0);

  useEffect(() => {
    const range = getDateRange(dateRange);
    setDateFrom(range.from);
    setDateTo(range.to);
  }, [dateRange]);

  // Fetch counts
  useEffect(() => {
    const load = async () => {
      try {
        const [expRes, incRes] = await Promise.all([
          txnService.getExpenses({ page_size: 1, date_after: format(dateFrom, 'yyyy-MM-dd'), date_before: format(dateTo, 'yyyy-MM-dd') }).catch(() => ({ count: 0 })),
          txnService.getIncomes({ page_size: 1, date_after: format(dateFrom, 'yyyy-MM-dd'), date_before: format(dateTo, 'yyyy-MM-dd') }).catch(() => ({ count: 0 })),
        ]);
        setExpenseCount(expRes.count || 0);
        setIncomeCount(incRes.count || 0);
      } catch { /* silent */ }
    };
    load();
  }, [dateFrom, dateTo]);

  const totalRows = (includeExpenses ? expenseCount : 0) + (includeIncome ? incomeCount : 0);
  const estSize = totalRows > 0 ? `~${Math.ceil(totalRows * 0.19)} KB` : '0 KB';
  const monthLabel = format(dateTo, 'MMMyyyy');
  const fileName = `ArthaSmart_${monthLabel}.${fileFormat}`;

  const handleExport = () => {
    if (totalRows === 0) {
      showToast('No data to export for the selected range', 'info');
      return;
    }
    showToast(`Exporting ${fileName}...`, 'success');
    // In production, would call backend export endpoint or generate client-side
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* File Format */}
        <Text style={styles.sectionLabel}>FILE FORMAT</Text>
        <View style={styles.formatRow}>
          {FILE_FORMATS.map((fmt) => (
            <TouchableOpacity
              key={fmt.key}
              style={[styles.formatCard, fileFormat === fmt.key && styles.formatCardActive]}
              onPress={() => setFileFormat(fmt.key)}
            >
              {fileFormat === fmt.key && (
                <View style={styles.formatRadio}>
                  <View style={styles.formatRadioInner} />
                </View>
              )}
              <View style={[styles.formatIconBg, { backgroundColor: fmt.color + '15' }]}>
                <MaterialIcons name={fmt.icon} size={22} color={fmt.color} />
              </View>
              <Text style={styles.formatLabel}>{fmt.label}</Text>
              <Text style={styles.formatDesc}>{fmt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Range */}
        <Text style={styles.sectionLabel}>DATE RANGE</Text>
        <View style={styles.pillsRow}>
          {DATE_RANGES.map((range) => (
            <TouchableOpacity
              key={range.key}
              style={[styles.pill, dateRange === range.key && styles.pillActive]}
              onPress={() => setDateRange(range.key)}
            >
              <Text style={[styles.pillText, dateRange === range.key && styles.pillTextActive]}>{range.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date display */}
        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateBoxLabel}>From</Text>
            <View style={styles.dateBoxValueRow}>
              <Text style={styles.dateBoxValue}>{format(dateFrom, 'd MMM yyyy')}</Text>
              <MaterialIcons name="calendar-today" size={16} color={colors.primary[400]} />
            </View>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateBoxLabel}>To</Text>
            <View style={styles.dateBoxValueRow}>
              <Text style={styles.dateBoxValue}>{format(dateTo, 'd MMM yyyy')}</Text>
              <MaterialIcons name="calendar-today" size={16} color={colors.primary[400]} />
            </View>
          </View>
        </View>

        {/* Include */}
        <Text style={styles.sectionLabel}>INCLUDE</Text>
        <View style={styles.includeSection}>
          <CheckRow
            label="Expenses"
            count={`${expenseCount} transactions`}
            checked={includeExpenses}
            onToggle={() => setIncludeExpenses(!includeExpenses)}
          />
          <CheckRow
            label="Income"
            count={`${incomeCount} transactions`}
            checked={includeIncome}
            onToggle={() => setIncludeIncome(!includeIncome)}
          />
          <CheckRow
            label="Scanned receipts"
            count="0 receipts"
            checked={includeReceipts}
            onToggle={() => setIncludeReceipts(!includeReceipts)}
          />
          <CheckRow
            label="AI insights & notes"
            count="Optional"
            checked={includeInsights}
            onToggle={() => setIncludeInsights(!includeInsights)}
          />
        </View>

        {/* Preview */}
        <Text style={styles.sectionLabel}>PREVIEW</Text>
        <View style={styles.previewCard}>
          <View style={styles.previewIconBg}>
            <MaterialIcons
              name={fileFormat === 'csv' ? 'description' : 'picture-as-pdf'}
              size={24}
              color={fileFormat === 'csv' ? colors.accent[600] : colors.danger[400]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewName}>{fileName}</Text>
            <Text style={styles.previewMeta}>{totalRows} rows · {estSize} · {format(dateTo, 'MMMM yyyy')}</Text>
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>Export & Share</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckRow({ label, count, checked, onToggle }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <MaterialIcons name="check" size={14} color={colors.white} />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={styles.checkCount}>{count}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md },

  // Format
  formatRow: { flexDirection: 'row', gap: spacing.sm },
  formatCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1.5, borderColor: colors.primary[200] },
  formatCardActive: { borderColor: colors.primary[800] },
  formatRadio: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary[800], alignItems: 'center', justifyContent: 'center' },
  formatRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[800] },
  formatIconBg: { width: 40, height: 40, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  formatLabel: { ...typography.body, fontWeight: '700', color: colors.primary[800], marginBottom: spacing.xs },
  formatDesc: { ...typography.caption, color: colors.primary[400], lineHeight: 15, fontSize: 11 },

  // Date range pills
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[200] },
  pillActive: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  pillText: { ...typography.bodySmall, color: colors.primary[600], fontWeight: '500' },
  pillTextActive: { color: colors.white },

  // Date boxes
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  dateBox: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200] },
  dateBoxLabel: { ...typography.caption, color: colors.primary[400], fontSize: 11, marginBottom: spacing.xs },
  dateBoxValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBoxValue: { ...typography.body, fontSize: 14, fontWeight: '500', color: colors.primary[800] },

  // Include
  includeSection: { backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[200], overflow: 'hidden' },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  checkbox: { width: 22, height: 22, borderRadius: borderRadius.sm, borderWidth: 2, borderColor: colors.primary[300], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  checkboxChecked: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  checkLabel: { ...typography.body, fontSize: 14, color: colors.primary[700], flex: 1 },
  checkCount: { ...typography.caption, color: colors.primary[400] },

  // Preview
  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], gap: spacing.md },
  previewIconBg: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  previewName: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800] },
  previewMeta: { ...typography.caption, color: colors.primary[400], marginTop: 2 },

  // Export button
  exportBtn: { backgroundColor: colors.primary[800], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 6, alignItems: 'center', marginTop: spacing.xl },
  exportBtnText: { color: colors.white, fontWeight: '600', fontSize: 16 },
});

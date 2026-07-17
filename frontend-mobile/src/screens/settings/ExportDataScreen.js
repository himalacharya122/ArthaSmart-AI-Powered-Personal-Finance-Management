import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  format,
  subMonths,
  startOfYear,
  startOfWeek,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isSameDay,
  isSameMonth,
  isAfter,
  isBefore,
} from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
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

const csvEscape = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function ExportDataScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  const [fileFormat, setFileFormat] = useState('csv');
  const [dateRange, setDateRange] = useState('month');
  const [dateFrom, setDateFrom] = useState(getDateRange('month').from);
  const [dateTo, setDateTo] = useState(getDateRange('month').to);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);

  const [expenseCount, setExpenseCount] = useState(0);
  const [incomeCount, setIncomeCount] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // 'from' | 'to'
  const [exporting, setExporting] = useState(false);

  // Sync dates when a preset is chosen
  useEffect(() => {
    if (dateRange === 'custom') return;
    const r = getDateRange(dateRange);
    setDateFrom(r.from);
    setDateTo(r.to);
  }, [dateRange]);

  // Fetch counts for preview
  useEffect(() => {
    const load = async () => {
      try {
        const [expRes, incRes] = await Promise.all([
          txnService.getExpenses({
            page_size: 1,
            date_after: format(dateFrom, 'yyyy-MM-dd'),
            date_before: format(dateTo, 'yyyy-MM-dd'),
          }).catch(() => ({ count: 0 })),
          txnService.getIncomes({
            page_size: 1,
            date_after: format(dateFrom, 'yyyy-MM-dd'),
            date_before: format(dateTo, 'yyyy-MM-dd'),
          }).catch(() => ({ count: 0 })),
        ]);
        setExpenseCount(expRes.count || 0);
        setIncomeCount(incRes.count || 0);
      } catch { /* silent */ }
    };
    load();
  }, [dateFrom, dateTo]);

  const totalRows = (includeExpenses ? expenseCount : 0) + (includeIncome ? incomeCount : 0);
  const estSize = totalRows > 0 ? `~${Math.ceil(totalRows * 0.19)} KB` : '0 KB';
  const fileLabel = format(dateFrom, 'yyyyMMdd') + '_' + format(dateTo, 'yyyyMMdd');
  const fileName = `ArthaSmart_${fileLabel}.${fileFormat}`;

  const openPicker = (target) => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handlePickDate = (date) => {
    if (pickerTarget === 'from') {
      setDateFrom(startOfDay(date));
      // Keep ordering: if from > to, push to forward
      if (isAfter(startOfDay(date), dateTo)) setDateTo(endOfDay(date));
    } else {
      setDateTo(endOfDay(date));
      if (isBefore(endOfDay(date), dateFrom)) setDateFrom(startOfDay(date));
    }
    setDateRange('custom');
    setPickerOpen(false);
  };

  const fetchAll = async (fetcher, params) => {
    let page = 1;
    const all = [];
    while (true) {
      const res = await fetcher({ ...params, page, page_size: 200 });
      const items = res.results || res || [];
      all.push(...items);
      if (!res.next || items.length === 0) break;
      page += 1;
      if (page > 50) break; // safety
    }
    return all;
  };

  const buildCsv = (expenses, incomes) => {
    const header = ['Type', 'Date', 'Category', 'Amount', 'Currency', 'Description', 'Merchant', 'Payment Method', 'Receipt'];
    const lines = [header.join(',')];

    if (includeExpenses) {
      expenses.forEach((e) => {
        lines.push([
          'Expense',
          e.date,
          e.category_name || '',
          e.amount,
          e.currency || '',
          e.description || '',
          e.merchant || '',
          e.payment_method || '',
          includeReceipts ? (e.receipt_url || e.receipt || '') : '',
        ].map(csvEscape).join(','));
      });
    }

    if (includeIncome) {
      incomes.forEach((i) => {
        lines.push([
          'Income',
          i.date,
          i.category_name || i.source || '',
          i.amount,
          i.currency || '',
          i.description || '',
          '',
          '',
          '',
        ].map(csvEscape).join(','));
      });
    }

    return lines.join('\n');
  };

  const buildHtml = (expenses, incomes) => {
    const fmtMoney = (a) => Number(a || 0).toLocaleString();
    const expTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const incTotal = incomes.reduce((s, e) => s + Number(e.amount || 0), 0);
    const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'User';

    const expRows = includeExpenses ? expenses.map((e) => `
      <tr>
        <td>${e.date}</td>
        <td>${e.category_name || ''}</td>
        <td>${(e.description || e.merchant || '').replace(/</g, '&lt;')}</td>
        <td class="amt">${fmtMoney(e.amount)}</td>
      </tr>`).join('') : '';

    const incRows = includeIncome ? incomes.map((i) => `
      <tr>
        <td>${i.date}</td>
        <td>${i.category_name || i.source || ''}</td>
        <td>${(i.description || '').replace(/</g, '&lt;')}</td>
        <td class="amt pos">${fmtMoney(i.amount)}</td>
      </tr>`).join('') : '';

    return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1f2937; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6b7280; margin-bottom: 24px; font-size: 12px; }
  .summary { display: flex; gap: 12px; margin-bottom: 24px; }
  .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .card .lbl { font-size: 10px; color: #6b7280; letter-spacing: 0.5px; }
  .card .val { font-size: 18px; font-weight: 700; margin-top: 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: #374151; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 6px 8px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; color: #b91c1c; font-weight: 600; }
  .pos { color: #047857; }
</style></head><body>
  <h1>ArthaSmart Statement</h1>
  <div class="sub">${userName} · ${format(dateFrom, 'd MMM yyyy')} – ${format(dateTo, 'd MMM yyyy')}</div>
  <div class="summary">
    ${includeExpenses ? `<div class="card"><div class="lbl">EXPENSES</div><div class="val" style="color:#b91c1c">${fmtMoney(expTotal)}</div><div class="lbl">${expenses.length} txns</div></div>` : ''}
    ${includeIncome ? `<div class="card"><div class="lbl">INCOME</div><div class="val" style="color:#047857">${fmtMoney(incTotal)}</div><div class="lbl">${incomes.length} txns</div></div>` : ''}
    <div class="card"><div class="lbl">NET</div><div class="val">${fmtMoney(incTotal - expTotal)}</div></div>
  </div>
  ${includeExpenses && expenses.length > 0 ? `<h2>Expenses</h2><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${expRows}</tbody></table>` : ''}
  ${includeIncome && incomes.length > 0 ? `<h2>Income</h2><table><thead><tr><th>Date</th><th>Source</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${incRows}</tbody></table>` : ''}
</body></html>`;
  };

  const handleExport = async () => {
    if (!includeExpenses && !includeIncome) {
      showToast('Pick at least one of Expenses or Income', 'info');
      return;
    }
    if (totalRows === 0) {
      showToast('No data to export for the selected range', 'info');
      return;
    }

    setExporting(true);
    try {
      const params = {
        date_after: format(dateFrom, 'yyyy-MM-dd'),
        date_before: format(dateTo, 'yyyy-MM-dd'),
      };

      const [expenses, incomes] = await Promise.all([
        includeExpenses ? fetchAll(txnService.getExpenses, params) : Promise.resolve([]),
        includeIncome ? fetchAll(txnService.getIncomes, params) : Promise.resolve([]),
      ]);

      let fileUri;
      let mimeType;

      if (fileFormat === 'csv') {
        const csv = buildCsv(expenses, incomes);
        fileUri = FileSystem.cacheDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        mimeType = 'text/csv';
      } else {
        const html = buildHtml(expenses, incomes);
        const printed = await Print.printToFileAsync({ html, base64: false });
        // Rename to friendly filename
        const dest = FileSystem.cacheDirectory + fileName;
        try {
          await FileSystem.moveAsync({ from: printed.uri, to: dest });
          fileUri = dest;
        } catch {
          fileUri = printed.uri;
        }
        mimeType = 'application/pdf';
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast(`Saved to ${fileUri} (sharing unavailable on this device)`, 'info');
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: 'Share ArthaSmart export',
        UTI: fileFormat === 'csv' ? 'public.comma-separated-values-text' : 'com.adobe.pdf',
      });
    } catch (err) {
      const msg = err?.message || 'Export failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.dateBox, dateRange === 'custom' && styles.dateBoxActive]}
            onPress={() => openPicker('from')}
            activeOpacity={0.7}
          >
            <Text style={styles.dateBoxLabel}>From</Text>
            <View style={styles.dateBoxValueRow}>
              <Text style={styles.dateBoxValue}>{format(dateFrom, 'd MMM yyyy')}</Text>
              <MaterialIcons name="calendar-today" size={16} color={colors.primary[500]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateBox, dateRange === 'custom' && styles.dateBoxActive]}
            onPress={() => openPicker('to')}
            activeOpacity={0.7}
          >
            <Text style={styles.dateBoxLabel}>To</Text>
            <View style={styles.dateBoxValueRow}>
              <Text style={styles.dateBoxValue}>{format(dateTo, 'd MMM yyyy')}</Text>
              <MaterialIcons name="calendar-today" size={16} color={colors.primary[500]} />
            </View>
          </TouchableOpacity>
        </View>

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
            label="Receipt URLs"
            count="Add receipt links to CSV"
            checked={includeReceipts}
            onToggle={() => setIncludeReceipts(!includeReceipts)}
          />
        </View>

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
            <Text style={styles.previewName} numberOfLines={1}>{fileName}</Text>
            <Text style={styles.previewMeta}>
              {totalRows} rows · {estSize} · {format(dateFrom, 'd MMM')} – {format(dateTo, 'd MMM yyyy')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.exportBtnText}>Export & Share</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <CalendarPickerModal
        visible={pickerOpen}
        initialDate={pickerTarget === 'from' ? dateFrom : dateTo}
        minDate={pickerTarget === 'to' ? dateFrom : null}
        maxDate={pickerTarget === 'from' ? dateTo : new Date()}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickDate}
        title={pickerTarget === 'from' ? 'Select start date' : 'Select end date'}
      />
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

function CalendarPickerModal({ visible, initialDate, minDate, maxDate, onClose, onPick, title }) {
  const [viewMonth, setViewMonth] = useState(initialDate || new Date());

  useEffect(() => {
    if (visible) setViewMonth(initialDate || new Date());
  }, [visible, initialDate]);

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

  const isDisabled = (d) => {
    if (minDate && isBefore(d, startOfDay(minDate))) return true;
    if (maxDate && isAfter(d, endOfDay(maxDate))) return true;
    return false;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={cal.overlay} onPress={onClose}>
        <Pressable style={cal.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={cal.title}>{title}</Text>

          <View style={cal.monthNav}>
            <TouchableOpacity
              onPress={() => setViewMonth(subMonths(viewMonth, 1))}
              style={cal.navBtn}
            >
              <MaterialIcons name="chevron-left" size={24} color={colors.primary[700]} />
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity
              onPress={() => setViewMonth(addMonths(viewMonth, 1))}
              style={cal.navBtn}
            >
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
              const disabled = isDisabled(d);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    cal.dayCell,
                    selected && cal.dayCellSelected,
                  ]}
                  onPress={() => !disabled && onPick(d)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      cal.dayText,
                      !inMonth && cal.dayTextOutMonth,
                      disabled && cal.dayTextDisabled,
                      today && !selected && cal.dayTextToday,
                      selected && cal.dayTextSelected,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={cal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={cal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[500], marginBottom: spacing.sm, marginTop: spacing.md },

  formatRow: { flexDirection: 'row', gap: spacing.sm },
  formatCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1.5, borderColor: colors.primary[200] },
  formatCardActive: { borderColor: colors.primary[800] },
  formatRadio: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary[800], alignItems: 'center', justifyContent: 'center' },
  formatRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[800] },
  formatIconBg: { width: 40, height: 40, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  formatLabel: { ...typography.body, fontWeight: '700', color: colors.primary[800], marginBottom: spacing.xs },
  formatDesc: { ...typography.caption, color: colors.primary[500], lineHeight: 15, fontSize: 11 },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[200] },
  pillActive: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  pillText: { ...typography.bodySmall, color: colors.primary[600], fontWeight: '500' },
  pillTextActive: { color: colors.white },

  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  dateBox: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.primary[200] },
  dateBoxActive: { borderColor: colors.primary[800], borderWidth: 1.5 },
  dateBoxLabel: { ...typography.caption, color: colors.primary[500], fontSize: 11, marginBottom: spacing.xs, fontWeight: '500' },
  dateBoxValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBoxValue: { ...typography.body, fontSize: 14, fontWeight: '500', color: colors.primary[800] },

  includeSection: { backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[200], overflow: 'hidden' },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  checkbox: { width: 22, height: 22, borderRadius: borderRadius.sm, borderWidth: 2, borderColor: colors.primary[300], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  checkboxChecked: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  checkLabel: { ...typography.body, fontSize: 14, color: colors.primary[700], flex: 1 },
  checkCount: { ...typography.caption, color: colors.primary[500] },

  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200], gap: spacing.md },
  previewIconBg: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  previewName: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800] },
  previewMeta: { ...typography.caption, color: colors.primary[500], marginTop: 2 },

  exportBtn: { backgroundColor: colors.primary[800], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 6, alignItems: 'center', marginTop: spacing.xl },
  exportBtnText: { color: colors.white, fontWeight: '600', fontSize: 16 },
});

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 360, backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg },
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

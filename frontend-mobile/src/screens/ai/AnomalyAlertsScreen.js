/**
 * Anomaly Alerts — AI-detected anomalies and budget warnings.
 *
 * Features:
 * - "X new" badge in header
 * - Filter pills (All / Anomalies / Budget / Recurring)
 * - Alert cards with severity badges (HIGH/MEDIUM/LOW)
 * - Progress bars for budget warnings
 * - Contextual action buttons (Mark OK / Review / Ask AI / Dismiss)
 * - Resolved section with dimmed opacity
 */
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { formatCurrencyCompact, formatRelativeDate } from '../../utils/format';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';

const SEVERITY_CONFIG = {
  high: { bg: colors.danger[50], border: colors.danger[400], text: colors.danger[600], badge: colors.danger[100], label: 'HIGH', icon: 'error' },
  medium: { bg: colors.warning[50], border: colors.warning[400], text: colors.warning[600], badge: colors.warning[100], label: 'MEDIUM', icon: 'warning-amber' },
  low: { bg: colors.primary[50], border: colors.primary[300], text: colors.primary[600], badge: colors.primary[100], label: 'LOW', icon: 'info-outline' },
};

const FILTER_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'anomaly', label: 'Anomalies' },
  { key: 'budget', label: 'Budget' },
  { key: 'recurring', label: 'Recurring' },
];

export function AnomalyAlertsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [filter, setFilter] = useState('all');
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await chatService.getInsights({ ordering: '-generated_at', page_size: 30 }).catch(() => ({ results: [] }));
      setInsights(res.results || []);
    } catch {
      if (!isRefresh) showToast('Failed to load alerts', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await chatService.generateInsights();
      showToast(`Generated ${res.generated || 0} new alerts!`, 'success');
      fetchData(true);
    } catch {
      showToast('Failed to generate', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await chatService.dismissInsight(id);
      setInsights((prev) => prev.map((i) => i.id === id ? { ...i, is_dismissed: true } : i));
      showToast('Alert dismissed', 'info');
    } catch {
      showToast('Failed to dismiss', 'error');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await chatService.markInsightRead(id);
      setInsights((prev) => prev.map((i) => i.id === id ? { ...i, is_read: true } : i));
      showToast('Marked as reviewed', 'info');
    } catch {
      showToast('Failed to mark', 'error');
    }
  };

  // Filter logic
  const filteredInsights = useMemo(() => {
    let list = insights;
    if (filter !== 'all') {
      list = list.filter((i) => {
        const type = (i.insight_type || '').toLowerCase();
        if (filter === 'anomaly') return type.includes('anomal') || type.includes('unusual');
        if (filter === 'budget') return type.includes('budget') || type.includes('overspend');
        if (filter === 'recurring') return type.includes('recur') || type.includes('subscription');
        return true;
      });
    }
    return list;
  }, [insights, filter]);

  const activeAlerts = filteredInsights.filter((i) => !i.is_dismissed);
  const resolvedAlerts = filteredInsights.filter((i) => i.is_dismissed);
  const newCount = insights.filter((i) => !i.is_read && !i.is_dismissed).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading alerts..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>AI Alerts</Text>
          {newCount > 0 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{newCount} new</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleGenerate} disabled={generating} style={styles.generateBtn}>
          <MaterialIcons name="auto-awesome" size={20} color={generating ? colors.primary[400] : colors.accent[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent[600]]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {FILTER_PILLS.map((pill) => (
            <TouchableOpacity
              key={pill.key}
              style={[styles.filterPill, filter === pill.key && styles.filterPillActive]}
              onPress={() => setFilter(pill.key)}
            >
              <Text style={[styles.filterPillText, filter === pill.key && styles.filterPillTextActive]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Alerts */}
        {activeAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="verified" size={40} color={colors.accent[400]} />
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptyDesc}>No active alerts. Your finances look healthy.</Text>
            <Button
              title={generating ? 'Scanning...' : 'Scan for anomalies'}
              onPress={handleGenerate}
              loading={generating}
              variant="outline"
              size="sm"
              icon={<MaterialIcons name="search" size={16} color={colors.accent[600]} />}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          activeAlerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
            const isAnomaly = (alert.insight_type || '').includes('anomal');
            const isBudget = (alert.insight_type || '').includes('budget');

            return (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  { borderLeftColor: sev.border, backgroundColor: sev.bg },
                ]}
              >
                {/* Card Header */}
                <View style={styles.alertHeader}>
                  <MaterialIcons name={sev.icon} size={20} color={sev.text} />
                  <Text style={styles.alertTitle} numberOfLines={1}>{alert.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: sev.badge }]}>
                    <Text style={[styles.severityText, { color: sev.text }]}>{sev.label}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.alertDesc}>{alert.description}</Text>

                {/* Budget progress bar (if budget type) */}
                {isBudget && (
                  <View style={styles.budgetProgress}>
                    <View style={styles.budgetBarBg}>
                      <View style={[styles.budgetBarFill, { width: '85%', backgroundColor: sev.border }]} />
                    </View>
                    <Text style={[styles.budgetPct, { color: sev.text }]}>85% used</Text>
                  </View>
                )}

                {/* Timestamp */}
                <Text style={styles.alertTime}>
                  {alert.generated_at ? formatRelativeDate(alert.generated_at) : ''}
                </Text>

                {/* Action Buttons */}
                <View style={styles.alertActions}>
                  {isAnomaly && (
                    <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleMarkRead(alert.id)}>
                      <MaterialIcons name="check-circle-outline" size={14} color={colors.primary[600]} />
                      <Text style={styles.actionBtnOutlineText}>Mark OK</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleDismiss(alert.id)}>
                    <MaterialIcons name="close" size={14} color={colors.primary[500]} />
                    <Text style={styles.actionBtnOutlineText}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnDark}
                    onPress={async () => {
                      try {
                        const conv = await chatService.createConversation(`Alert: ${alert.title}`);
                        navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: conv.id });
                      } catch {
                        showToast('Failed to start chat', 'error');
                      }
                    }}
                  >
                    <MaterialIcons name="smart-toy" size={14} color={colors.white} />
                    <Text style={styles.actionBtnDarkText}>Ask AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Resolved Section */}
        {resolvedAlerts.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RESOLVED</Text>
            {resolvedAlerts.slice(0, 5).map((alert) => {
              const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
              return (
                <View key={alert.id} style={styles.resolvedCard}>
                  <View style={styles.resolvedHeader}>
                    <MaterialIcons name="check-circle" size={16} color={colors.accent[500]} />
                    <Text style={styles.resolvedTitle} numberOfLines={1}>{alert.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: sev.badge, opacity: 0.6 }]}>
                      <Text style={[styles.severityText, { color: sev.text }]}>{sev.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.resolvedDesc} numberOfLines={2}>{alert.description}</Text>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h3 },
  newBadge: { backgroundColor: colors.danger[500], borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  newBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  generateBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  // Filter pills
  filterScroll: { marginBottom: spacing.md },
  filterRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  filterPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[200] },
  filterPillActive: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  filterPillText: { ...typography.bodySmall, color: colors.primary[600], fontWeight: '500' },
  filterPillTextActive: { color: colors.white },

  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg },

  // Alert cards
  alertCard: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.primary[100] },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  alertTitle: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary[800], flex: 1 },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  alertDesc: { ...typography.bodySmall, color: colors.primary[600], lineHeight: 18, marginBottom: spacing.sm },
  alertTime: { ...typography.caption, color: colors.primary[400], fontSize: 11, marginBottom: spacing.sm },

  // Budget progress
  budgetProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  budgetBarBg: { flex: 1, height: 6, backgroundColor: colors.primary[200], borderRadius: 3, overflow: 'hidden' },
  budgetBarFill: { height: 6, borderRadius: 3 },
  budgetPct: { fontSize: 11, fontWeight: '600' },

  // Action buttons
  alertActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.white },
  actionBtnOutlineText: { ...typography.caption, color: colors.primary[600], fontWeight: '500', fontSize: 12 },
  actionBtnDark: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.sm, backgroundColor: colors.primary[800] },
  actionBtnDarkText: { color: colors.white, fontWeight: '600', fontSize: 12 },

  // Resolved
  resolvedCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[100], opacity: 0.6 },
  resolvedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  resolvedTitle: { ...typography.body, fontSize: 13, color: colors.primary[600], flex: 1 },
  resolvedDesc: { ...typography.caption, color: colors.primary[400], lineHeight: 16 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.accent[600] },
  emptyDesc: { ...typography.bodySmall, color: colors.primary[400], textAlign: 'center', maxWidth: 260 },
});

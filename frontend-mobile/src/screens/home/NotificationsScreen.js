/**
 * NotificationsScreen, Full notification center.
 *
 * - Filter tabs: All / Unread / Budget / Insight / System
 * - Notification cards with type icons, severity colors, timestamps
 * - Swipe actions: mark read, delete
 * - Mark all as read
 * - Pull to refresh
 * - Empty states per filter
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { formatRelativeDate } from '../../utils/format';
import * as notifService from '../../services/notifications';
import { useAppStore } from '../../store/appStore';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'budget_alert', label: 'Budget' },
  { key: 'insight', label: 'Insights' },
  { key: 'anomaly', label: 'Anomalies' },
  { key: 'system', label: 'System' },
];

const TYPE_CONFIG = {
  budget_alert: { icon: 'account-balance-wallet', color: colors.warning[500], bg: colors.warning[50] },
  insight: { icon: 'lightbulb', color: colors.info[500], bg: colors.info[50] },
  reminder: { icon: 'alarm', color: colors.accent[600], bg: colors.accent[50] },
  system: { icon: 'settings', color: colors.primary[500], bg: colors.primary[100] },
  anomaly: { icon: 'warning', color: colors.danger[500], bg: colors.danger[50] },
  recurring: { icon: 'repeat', color: colors.accent[600], bg: colors.accent[50] },
  receipt_processed: { icon: 'receipt', color: colors.accent[500], bg: colors.accent[50] },
};

export function NotificationsScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const params = { page_size: 50, ordering: '-created_at' };
      if (filter === 'unread') params.is_read = false;
      else if (filter !== 'all') params.notification_type = filter;
      const res = await notifService.getNotifications(params);
      setNotifications(res.results || res || []);
    } catch (err) {
      if (!isRefresh) showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, showToast]);

  useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

  // Mark single as read
  const handleMarkRead = async (id) => {
    try {
      await notifService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      showToast('Failed to mark as read', 'error');
    }
  };

  // Delete single
  const handleDelete = async (id) => {
    try {
      await notifService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('Notification removed', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notifService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('All marked as read', 'success');
    } catch {
      showToast('Failed to mark all as read', 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderNotification = ({ item }) => {
    const config = TYPE_CONFIG[item.notification_type] || TYPE_CONFIG.SYSTEM;
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
        activeOpacity={0.7}
        onPress={() => {
          if (!item.is_read) handleMarkRead(item.id);
        }}
        onLongPress={() => handleDelete(item.id)}
      >
        {/* Unread indicator */}
        {!item.is_read && <View style={styles.unreadDot} />}

        {/* Type icon */}
        <View style={[styles.notifIcon, { backgroundColor: config.bg }]}>
          <MaterialIcons name={config.icon} size={22} color={config.color} />
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{formatRelativeDate(item.created_at)}</Text>
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <View style={styles.notifFooter}>
            <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
              <Text style={[styles.typeBadgeText, { color: config.color }]}>
                {(item.notification_type || 'system').replace(/_/g, ' ')}
              </Text>
            </View>
            {!item.is_read && (
              <TouchableOpacity
                style={styles.markReadBtn}
                onPress={() => handleMarkRead(item.id)}
              >
                <MaterialIcons name="done" size={14} color={colors.accent[600]} />
                <Text style={styles.markReadText}>Mark read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[800]} />
        </TouchableOpacity>
        <Text style={typography.h2}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.accent[600]} />
            ) : (
              <Text style={styles.markAllText}>Read all</Text>
            )}
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 60 }} />}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              activeOpacity={0.7}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Notification list */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary[400]} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="notifications-none" size={48} color={colors.primary[300]} />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {filter === 'unread'
              ? "You've read all your notifications"
              : 'Budget alerts, insights, and updates will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={colors.primary[400]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },
  markAllBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  markAllText: { ...typography.buttonSmall, color: colors.accent[600] },

  // Filters
  filterRow: { marginBottom: spacing.sm, marginTop: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.primary[200], marginRight: spacing.sm,
  },
  filterChipActive: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  filterText: { ...typography.buttonSmall, color: colors.primary[500] },
  filterTextActive: { color: colors.white },

  // Notification card
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.white,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm,
    ...shadow.sm,
  },
  notifCardUnread: {
    backgroundColor: colors.info[50], borderLeftWidth: 3, borderLeftColor: colors.info[500],
  },
  unreadDot: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.info[500],
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { ...typography.body, fontWeight: '500', fontSize: 14, flex: 1, marginRight: spacing.sm },
  notifTitleUnread: { fontWeight: '700', color: colors.primary[800] },
  notifTime: { ...typography.caption, fontSize: 11 },
  notifMessage: { ...typography.bodySmall, lineHeight: 18, marginBottom: spacing.xs },
  notifFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  markReadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  markReadText: { fontSize: 11, fontWeight: '600', color: colors.accent[600] },

  // Empty
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.h3, color: colors.primary[500], marginBottom: spacing.xs },
  emptyHint: { ...typography.bodySmall, textAlign: 'center', paddingHorizontal: spacing.xl },
});

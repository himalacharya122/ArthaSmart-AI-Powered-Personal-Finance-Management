/**
 * NotificationPreferencesScreen, Manage notification settings.
 *
 * - Toggle channels per notification type (email, push, in-app, sms)
 * - Quiet hours configuration
 * - Matches backend NotificationPreference model
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import * as notifService from '../../services/notifications';
import { useAppStore } from '../../store/appStore';

const NOTIFICATION_TYPES = [
  { key: 'budget_alert', label: 'Budget Alerts', icon: 'account-balance-wallet', desc: 'When you approach or exceed budget limits' },
  { key: 'insight', label: 'AI Insights', icon: 'lightbulb', desc: 'Smart spending insights and recommendations' },
  { key: 'anomaly', label: 'Anomaly Alerts', icon: 'warning', desc: 'Unusual spending patterns detected' },
  { key: 'reminder', label: 'Reminders', icon: 'alarm', desc: 'Bill payments and recurring expense reminders' },
  { key: 'recurring', label: 'Recurring Updates', icon: 'repeat', desc: 'When recurring transactions are processed' },
  { key: 'receipt_processed', label: 'Receipt Scans', icon: 'receipt', desc: 'When receipt OCR processing completes' },
  { key: 'system', label: 'System', icon: 'settings', desc: 'App updates and system notifications' },
];

const CHANNELS = [
  { key: 'push_enabled', label: 'Push', icon: 'notifications-active' },
  { key: 'in_app_enabled', label: 'In-App', icon: 'apps' },
  { key: 'email_enabled', label: 'Email', icon: 'email' },
];

export function NotificationPreferencesScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    notifService.getPreferences()
      .then((data) => {
        const prefMap = {};
        const list = Array.isArray(data) ? data : data.results || [];
        list.forEach((p) => { prefMap[p.notification_type] = p; });
        setPrefs(prefMap);
      })
      .catch(() => showToast('Failed to load preferences', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const toggleChannel = (type, channel) => {
    setPrefs((prev) => {
      const current = prev[type] || { notification_type: type, push_enabled: true, in_app_enabled: true, email_enabled: true, sms_enabled: false };
      return {
        ...prev,
        [type]: { ...current, [channel]: !current[channel] },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const prefList = NOTIFICATION_TYPES.map((t) => ({
        notification_type: t.key,
        push_enabled: prefs[t.key]?.push_enabled ?? true,
        in_app_enabled: prefs[t.key]?.in_app_enabled ?? true,
        email_enabled: prefs[t.key]?.email_enabled ?? true,
        sms_enabled: prefs[t.key]?.sms_enabled ?? false,
      }));
      await notifService.updatePreferences(prefList);
      showToast('Preferences saved', 'success');
      navigation.goBack();
    } catch {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary[400]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[800]} />
        </TouchableOpacity>
        <Text style={typography.h3}>Notification Settings</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.accent[600]} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHint}>
          Choose how you want to be notified for each type of alert.
        </Text>

        {NOTIFICATION_TYPES.map((type) => {
          const pref = prefs[type.key] || { push_enabled: true, in_app_enabled: true, email_enabled: true };
          return (
            <View key={type.key} style={styles.typeCard}>
              <View style={styles.typeHeader}>
                <View style={styles.typeIconWrap}>
                  <MaterialIcons name={type.icon} size={20} color={colors.primary[600]} />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={styles.typeDesc}>{type.desc}</Text>
                </View>
              </View>
              <View style={styles.channelRow}>
                {CHANNELS.map((ch) => (
                  <View key={ch.key} style={styles.channelItem}>
                    <MaterialIcons name={ch.icon} size={16} color={colors.primary[400]} />
                    <Text style={styles.channelLabel}>{ch.label}</Text>
                    <Switch
                      value={pref[ch.key] ?? true}
                      onValueChange={() => toggleChannel(type.key, ch.key)}
                      trackColor={{ false: colors.primary[200], true: colors.accent[300] }}
                      thumbColor={pref[ch.key] ? colors.accent[600] : colors.primary[400]}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={18} color={colors.info[500]} />
          <Text style={styles.infoText}>
            Push notifications require device permissions. You can manage them in your device settings.
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  saveText: { ...typography.button, color: colors.accent[600] },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  sectionHint: { ...typography.bodySmall, marginBottom: spacing.md, lineHeight: 20 },

  // Type card
  typeCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  typeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  typeIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  typeInfo: { flex: 1 },
  typeLabel: { ...typography.body, fontWeight: '600', fontSize: 14 },
  typeDesc: { ...typography.caption, marginTop: 1, lineHeight: 16 },

  channelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.primary[50], borderRadius: borderRadius.sm,
    padding: spacing.sm, paddingHorizontal: spacing.md,
  },
  channelItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  channelLabel: { fontSize: 11, fontWeight: '600', color: colors.primary[500] },

  // Info card
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.info[50], borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.sm,
  },
  infoText: { ...typography.caption, color: colors.info[500], flex: 1, lineHeight: 16 },
});

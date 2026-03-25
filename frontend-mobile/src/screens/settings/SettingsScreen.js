/**
 * Main settings screen.
 *
 * Sections: Profile header, Account & Finance, AI Suggestions, Notifications,
 * Security, Data Management, Legal & About, Danger Zone (delete + logout).
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

function SettingsRow({ icon, label, onPress, rightElement, danger }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIconBg, danger && { backgroundColor: colors.danger[50] }]}>
        <MaterialIcons name={icon} size={18} color={danger ? colors.danger[500] : colors.primary[600]} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.danger[500] }]}>{label}</Text>
      {rightElement || (onPress && <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />)}
    </TouchableOpacity>
  );
}

function SectionHeader({ label }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

export function SettingsScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useAppStore((s) => s.showToast);

  // Toggle states (local, would persist to backend/AsyncStorage in production)
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [spendingPersonality, setSpendingPersonality] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(true);
  const [budgetNotifications, setBudgetNotifications] = useState(true);
  const [appNotifications, setAppNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    // Re-read user on focus (in case profile was updated)
  }, []));

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      showToast('Failed to logout', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.accent[600]]} />}
      >
        {/* Profile Header */}
        <TouchableOpacity
          style={styles.profileHeader}
          onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.first_name || ''} {user?.last_name || ''}
            </Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <Text style={styles.profileLink}>View profile</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.primary[400]} />
        </TouchableOpacity>

        {/* Account & Finance */}
        <SectionHeader label="ACCOUNT & FINANCE" />
        <View style={styles.section}>
          <SettingsRow icon="person-outline" label="My Profile" onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE)} />
          <SettingsRow icon="attach-money" label="Monthly budget" onPress={() => showToast('Budget settings coming soon', 'info')} />
          <SettingsRow icon="category" label="Manage categories" onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORIES)} />
          <SettingsRow icon="currency-exchange" label="Currency" onPress={() => showToast('Currency: NPR', 'info')} />
          <SettingsRow icon="calendar-today" label="Budget reset day" onPress={() => showToast('Resets on 1st of each month', 'info')} />
        </View>

        {/* AI Suggestions */}
        <SectionHeader label="AI SUGGESTIONS" />
        <View style={styles.section}>
          <SettingsRow
            icon="warning-amber"
            label="Anomaly sensitivity"
            rightElement={<Switch value={anomalyAlerts} onValueChange={setAnomalyAlerts} trackColor={{ true: colors.accent[400] }} thumbColor={colors.white} />}
          />
          <SettingsRow
            icon="psychology"
            label="Spending personality"
            rightElement={<Switch value={spendingPersonality} onValueChange={setSpendingPersonality} trackColor={{ true: colors.accent[400] }} thumbColor={colors.white} />}
          />
          <SettingsRow
            icon="assessment"
            label="Monthly reports"
            rightElement={<Switch value={monthlyReports} onValueChange={setMonthlyReports} trackColor={{ true: colors.accent[400] }} thumbColor={colors.white} />}
          />
          <SettingsRow
            icon="trending-up"
            label="Anomaly alerts"
            rightElement={<Switch value={budgetAlerts} onValueChange={setBudgetAlerts} trackColor={{ true: colors.accent[400] }} thumbColor={colors.white} />}
          />
          <SettingsRow icon="refresh" label="Recurring reminders" onPress={() => showToast('Recurring reminders enabled', 'info')} />
        </View>

        {/* Notifications */}
        <SectionHeader label="NOTIFICATIONS" />
        <View style={styles.section}>
          <SettingsRow
            icon="notifications-none"
            label="Budget alerts"
            rightElement={<Switch value={budgetNotifications} onValueChange={setBudgetNotifications} trackColor={{ true: colors.accent[400] }} thumbColor={colors.white} />}
          />
          <SettingsRow
            icon="phone-android"
            label="App notifications"
            rightElement={<Switch value={appNotifications} onValueChange={setAppNotifications} trackColor={{ true: colors.accent[400] }} thumbColor={colors.white} />}
          />
          <SettingsRow
            icon="email"
            label="Email notifications"
            rightElement={<Switch value={emailNotifications} onValueChange={setEmailNotifications} trackColor={{ true: colors.accent[400] }} thumbColor={colors.white} />}
          />
        </View>

        {/* Security */}
        <SectionHeader label="SECURITY" />
        <View style={styles.section}>
          <SettingsRow icon="lock-outline" label="Change password" onPress={() => showToast('Password change coming soon', 'info')} />
          <SettingsRow icon="security" label="Two-Factor Auth (2FA)" onPress={() => showToast('2FA coming soon', 'info')} />
          <SettingsRow icon="devices" label="Active sessions" onPress={() => showToast('Session management coming soon', 'info')} />
        </View>

        {/* Data Management */}
        <SectionHeader label="DATA MANAGEMENT" />
        <View style={styles.section}>
          <SettingsRow icon="file-download" label="Export data" onPress={() => navigation.navigate(SCREEN_NAMES.EXPORT_DATA)} />
          <SettingsRow icon="add-circle-outline" label="Add expense shortcut" onPress={() => showToast('Shortcut configured', 'info')} />
        </View>

        {/* Legal & About */}
        <SectionHeader label="LEGAL & ABOUT" />
        <View style={styles.section}>
          <SettingsRow icon="privacy-tip" label="Privacy policy" onPress={() => navigation.navigate(SCREEN_NAMES.PRIVACY_POLICY)} />
          <SettingsRow icon="description" label="Terms of service" onPress={() => navigation.navigate(SCREEN_NAMES.TERMS_OF_SERVICE)} />
          <SettingsRow icon="emoji-events" label="Badges & rewards" onPress={() => showToast('Badges coming soon', 'info')} />
          <SettingsRow icon="info-outline" label="About & version" onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT)} />
        </View>

        {/* Danger Zone */}
        <SectionHeader label="DANGER ZONE" />
        <View style={styles.section}>
          <SettingsRow icon="logout" label="Log out" onPress={handleLogout} danger />
          <SettingsRow icon="delete-forever" label="Delete account" onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE, { scrollToDelete: true })} danger />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  scrollContent: { paddingBottom: spacing.xl },

  // Profile header
  profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[100] },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary[800], alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { ...typography.body, fontWeight: '600', color: colors.primary[800], fontSize: 16 },
  profileEmail: { ...typography.caption, color: colors.primary[400], marginTop: 2 },
  profileLink: { ...typography.caption, color: colors.primary[500], fontWeight: '500', marginTop: 4 },

  // Section
  sectionHeader: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  section: { backgroundColor: colors.white, marginHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[100], overflow: 'hidden' },

  // Row
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  rowIconBg: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  rowLabel: { ...typography.body, fontSize: 14, color: colors.primary[700], flex: 1 },
});

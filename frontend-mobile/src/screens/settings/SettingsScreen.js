import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import * as biometricService from '../../services/biometric';
import * as authService from '../../services/auth';
import * as notifService from '../../services/notifications';
import { storage } from '../../utils/storage';
import { formatResetDay } from '../../utils/budget';
import { BottomSheet } from '../../components/common/BottomSheet';

const NOTIF_TYPES = [
  'budget_alert', 'insight', 'anomaly', 'reminder',
  'recurring', 'receipt_processed', 'system',
];

function defaultPref(type) {
  return {
    notification_type: type,
    push_enabled: true,
    in_app_enabled: true,
    email_enabled: true,
    sms_enabled: false,
  };
}

function SettingsRow({ icon, label, onPress, rightElement, danger, value }) {
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
      {value != null && (
        <Text style={styles.rowValue}>{value}</Text>
      )}
      {rightElement || (onPress && <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />)}
    </TouchableOpacity>
  );
}

function SectionHeader({ label }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function PasswordInput({ label, value, onChangeText, placeholder, show, onToggleShow }) {
  return (
    <View style={cpStyles.field}>
      <Text style={cpStyles.fieldLabel}>{label}</Text>
      <View style={cpStyles.inputRow}>
        <TextInput
          style={cpStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.primary[400]}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          autoComplete="off"
          includeFontPadding={false}
        />
        <TouchableOpacity onPress={onToggleShow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name={show ? 'visibility-off' : 'visibility'} size={20} color={colors.primary[400]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SettingsScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const showToast = useAppStore((s) => s.showToast);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');

  // Budget reset day
  const [budgetResetDay, setBudgetResetDayState] = useState(1);
  const [showBudgetResetModal, setShowBudgetResetModal] = useState(false);
  const [selectedResetDay, setSelectedResetDay] = useState(1);

  useEffect(() => {
    storage.getBudgetResetDay().then((d) => {
      setBudgetResetDayState(d);
      setSelectedResetDay(d);
    });
  }, []);

  // Change Password modal state
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpShowOld, setCpShowOld] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpShowConfirm, setCpShowConfirm] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');

  useEffect(() => {
    (async () => {
      const support = await biometricService.checkBiometricSupport();
      setBiometricAvailable(support.available && support.enrolled);
      if (support.available) {
        const label = await biometricService.getBiometricLabel();
        setBiometricLabel(label);
      }
    })();
  }, []);

  const handleSaveBudgetResetDay = async () => {
    await storage.setBudgetResetDay(selectedResetDay);
    setBudgetResetDayState(selectedResetDay);
    setShowBudgetResetModal(false);
    showToast(`Budget resets on the ${formatResetDay(selectedResetDay)}`, 'success');
  };

  const handleBiometricToggle = async (value) => {
    if (value) {
      const result = await biometricService.authenticate(`Enable ${biometricLabel} for Squirrel`);
      if (result.success) {
        await setBiometricEnabled(true);
        showToast(`${biometricLabel} lock enabled`, 'success');
      } else {
        showToast('Authentication failed. Try again.', 'error');
      }
    } else {
      await setBiometricEnabled(false);
      showToast(`${biometricLabel} lock disabled`, 'info');
    }
  };

  const resetChangePassword = () => {
    setCpOld('');
    setCpNew('');
    setCpConfirm('');
    setCpShowOld(false);
    setCpShowNew(false);
    setCpShowConfirm(false);
    setCpError('');
  };

  const handleChangePassword = async () => {
    setCpError('');
    if (!cpOld || !cpNew || !cpConfirm) {
      setCpError('All fields are required.');
      return;
    }
    if (cpNew !== cpConfirm) {
      setCpError('New passwords do not match.');
      return;
    }
    if (cpNew.length < 8) {
      setCpError('New password must be at least 8 characters.');
      return;
    }
    if (cpNew === cpOld) {
      setCpError('New password must be different from your current password.');
      return;
    }

    setCpLoading(true);
    try {
      await authService.changePassword({
        old_password: cpOld,
        new_password: cpNew,
        new_password_confirm: cpConfirm,
      });
      showToast('Password updated successfully!', 'success');
      setShowChangePwd(false);
      resetChangePassword();
    } catch (err) {
      const data = err?.response?.data;
      // Helper to extract first message from array or string
      const pick = (val) => (Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : null));
      let message = '';
      if (data) {
        if (data.old_password) {
          // Wrong current password
          message = pick(data.old_password) || 'Your current password is incorrect.';
        } else if (data.new_password) {
          message = pick(data.new_password);
        } else if (data.new_password_confirm) {
          message = pick(data.new_password_confirm);
        } else if (data.detail) {
          message = typeof data.detail === 'string' ? data.detail : pick(data.detail);
        } else if (data.error) {
          message = data.error;
        }
      }
      if (!message) message = 'Failed to update password. Please try again.';
      setCpError(message);
    } finally {
      setCpLoading(false);
    }
  };

  // Notification preferences — loaded from backend
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifPrefs = useCallback(async () => {
    try {
      const data = await notifService.getPreferences();
      const list = Array.isArray(data) ? data : data?.results || data?.preferences || [];
      const map = {};
      list.forEach((p) => { map[p.notification_type] = p; });
      NOTIF_TYPES.forEach((t) => { if (!map[t]) map[t] = defaultPref(t); });
      setNotifPrefs(map);
    } catch {
      // Leave null so switches show as disabled
    }
  }, []);

  useEffect(() => { loadNotifPrefs(); }, [loadNotifPrefs]);

  const persistPrefs = async (nextMap) => {
    const before = notifPrefs;
    setNotifPrefs(nextMap); // optimistic
    setNotifSaving(true);
    try {
      const list = NOTIF_TYPES.map((t) => ({
        notification_type: t,
        push_enabled: nextMap[t]?.push_enabled ?? true,
        in_app_enabled: nextMap[t]?.in_app_enabled ?? true,
        email_enabled: nextMap[t]?.email_enabled ?? true,
        sms_enabled: nextMap[t]?.sms_enabled ?? false,
      }));
      await notifService.updatePreferences(list);
    } catch {
      setNotifPrefs(before); // rollback
      showToast('Failed to update notification preference', 'error');
    } finally {
      setNotifSaving(false);
    }
  };

  const budgetAlertsOn =
    !!(notifPrefs?.budget_alert?.push_enabled || notifPrefs?.budget_alert?.in_app_enabled);

  const appNotifOn =
    !!(notifPrefs && NOTIF_TYPES.some(
      (t) => notifPrefs[t]?.push_enabled || notifPrefs[t]?.in_app_enabled
    ));

  const emailNotifOn =
    !!(notifPrefs && NOTIF_TYPES.some((t) => notifPrefs[t]?.email_enabled));

  const handleToggleBudgetAlerts = (val) => {
    if (!notifPrefs) return;
    const next = { ...notifPrefs };
    next.budget_alert = { ...(next.budget_alert || defaultPref('budget_alert')), push_enabled: val, in_app_enabled: val };
    persistPrefs(next);
  };

  const handleToggleAppNotifications = (val) => {
    if (!notifPrefs) return;
    const next = { ...notifPrefs };
    NOTIF_TYPES.forEach((t) => {
      next[t] = { ...(next[t] || defaultPref(t)), push_enabled: val, in_app_enabled: val };
    });
    persistPrefs(next);
  };

  const handleToggleEmailNotifications = (val) => {
    if (!notifPrefs) return;
    const next = { ...notifPrefs };
    NOTIF_TYPES.forEach((t) => {
      next[t] = { ...(next[t] || defaultPref(t)), email_enabled: val };
    });
    persistPrefs(next);
  };

  useFocusEffect(useCallback(() => {}, []));

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

  // Collapsing header animation
  const scrollY = useRef(new Animated.Value(0)).current;

  // Large title fades out in the first 35 px of scroll
  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Compact bar title fades in between 30-60 px
  const smallTitleOpacity = scrollY.interpolate({
    inputRange: [30, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Separator under the compact bar only appears once you've scrolled
  const separatorOpacity = scrollY.interpolate({
    inputRange: [50, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Compact sticky bar — title fades in as you scroll */}
      <View style={styles.navBar}>
        <Animated.Text style={[styles.navTitle, { opacity: smallTitleOpacity }]}>
          Settings
        </Animated.Text>
        <Animated.View style={[styles.navSeparator, { opacity: separatorOpacity }]} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.accent[600]]} />}
      >
        {/* Large title — fades out as you scroll */}
        <Animated.Text style={[styles.largeTitle, { opacity: largeTitleOpacity }]}>
          Settings
        </Animated.Text>

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
          <SettingsRow
            icon="attach-money"
            label="Monthly budget"
            onPress={() => navigation.navigate(SCREEN_NAMES.MONTHLY_BUDGET)}
          />
          <SettingsRow
            icon="category"
            label="Manage categories"
            onPress={() => navigation.navigate(SCREEN_NAMES.CATEGORIES)}
          />
          <SettingsRow
            icon="calendar-today"
            label="Budget reset day"
            value={formatResetDay(budgetResetDay)}
            onPress={() => { setSelectedResetDay(budgetResetDay); setShowBudgetResetModal(true); }}
          />
        </View>

        {/* Notifications */}
        <SectionHeader label="NOTIFICATIONS" />
        <View style={styles.section}>
          <SettingsRow
            icon="notifications-none"
            label="Budget alerts"
            rightElement={
              <Switch
                value={budgetAlertsOn}
                onValueChange={handleToggleBudgetAlerts}
                disabled={!notifPrefs || notifSaving}
                trackColor={{ true: colors.accent[400] }}
                thumbColor={colors.white}
              />
            }
          />
          <SettingsRow
            icon="phone-android"
            label="App notifications"
            rightElement={
              <Switch
                value={appNotifOn}
                onValueChange={handleToggleAppNotifications}
                disabled={!notifPrefs || notifSaving}
                trackColor={{ true: colors.accent[400] }}
                thumbColor={colors.white}
              />
            }
          />
          <SettingsRow
            icon="email"
            label="Email notifications"
            rightElement={
              <Switch
                value={emailNotifOn}
                onValueChange={handleToggleEmailNotifications}
                disabled={!notifPrefs || notifSaving}
                trackColor={{ true: colors.accent[400] }}
                thumbColor={colors.white}
              />
            }
          />
        </View>

        {/* Security */}
        <SectionHeader label="SECURITY" />
        <View style={styles.section}>
          {biometricAvailable && (
            <SettingsRow
              icon="fingerprint"
              label={`${biometricLabel} unlock`}
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ true: colors.accent[400] }}
                  thumbColor={colors.white}
                />
              }
            />
          )}
          <SettingsRow
            icon="lock-outline"
            label="Change password"
            onPress={() => { resetChangePassword(); setShowChangePwd(true); }}
          />
        </View>

        {/* Data Management */}
        <SectionHeader label="DATA MANAGEMENT" />
        <View style={styles.section}>
          <SettingsRow icon="file-download" label="Export data" onPress={() => navigation.navigate(SCREEN_NAMES.EXPORT_DATA)} />
        </View>

        {/* Legal & About */}
        <SectionHeader label="LEGAL & ABOUT" />
        <View style={styles.section}>
          <SettingsRow icon="info-outline" label="About & legal" onPress={() => navigation.navigate(SCREEN_NAMES.ABOUT)} />
        </View>

        {/* Danger Zone */}
        <SectionHeader label="DANGER ZONE" />
        <View style={styles.section}>
          <SettingsRow icon="logout" label="Log out" onPress={handleLogout} danger />
          <SettingsRow icon="delete-forever" label="Delete account" onPress={() => navigation.navigate(SCREEN_NAMES.PROFILE, { scrollToDelete: true })} danger />
        </View>

        <View style={{ height: spacing.md }} />
      </Animated.ScrollView>

      {/* Change Password sheet */}
      <BottomSheet
        visible={showChangePwd}
        onClose={() => { setShowChangePwd(false); resetChangePassword(); }}
      >
        <View style={cpStyles.sheet}>
          <View style={cpStyles.handle} />

              {/* Header */}
              <View style={cpStyles.header}>
                <View style={cpStyles.headerIcon}>
                  <MaterialIcons name="lock-outline" size={22} color={colors.primary[700]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={cpStyles.title}>Change Password</Text>
                  <Text style={cpStyles.subtitle}>Enter your current and new password</Text>
                </View>
                <TouchableOpacity onPress={() => { setShowChangePwd(false); resetChangePassword(); }}>
                  <MaterialIcons name="close" size={22} color={colors.primary[400]} />
                </TouchableOpacity>
              </View>

              {/* Fields */}
              <PasswordInput
                label="Current password"
                value={cpOld}
                onChangeText={setCpOld}
                placeholder="Enter current password"
                show={cpShowOld}
                onToggleShow={() => setCpShowOld((v) => !v)}
              />
              <PasswordInput
                label="New password"
                value={cpNew}
                onChangeText={setCpNew}
                placeholder="At least 8 characters"
                show={cpShowNew}
                onToggleShow={() => setCpShowNew((v) => !v)}
              />
              <PasswordInput
                label="Confirm new password"
                value={cpConfirm}
                onChangeText={setCpConfirm}
                placeholder="Re-enter new password"
                show={cpShowConfirm}
                onToggleShow={() => setCpShowConfirm((v) => !v)}
              />

              {/* Error message */}
              {cpError ? (
                <View style={cpStyles.errorBox}>
                  <MaterialIcons name="error-outline" size={16} color={colors.danger[600]} />
                  <Text style={cpStyles.errorText}>{cpError}</Text>
                </View>
              ) : null}

              {/* Save button */}
              <TouchableOpacity
                style={[cpStyles.saveBtn, cpLoading && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={cpLoading}
                activeOpacity={0.85}
              >
                {cpLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={cpStyles.saveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Budget Reset Day sheet */}
      <BottomSheet
        visible={showBudgetResetModal}
        onClose={() => setShowBudgetResetModal(false)}
      >
        <View style={cpStyles.sheet}>
          <View style={cpStyles.handle} />

            <View style={cpStyles.header}>
              <View style={cpStyles.headerIcon}>
                <MaterialIcons name="calendar-today" size={22} color={colors.primary[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cpStyles.title}>Budget Reset Day</Text>
                <Text style={cpStyles.subtitle}>Transactions are grouped from this day each month</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBudgetResetModal(false)}>
                <MaterialIcons name="close" size={22} color={colors.primary[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              <View style={brdStyles.grid}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[brdStyles.dayBox, selectedResetDay === day && brdStyles.dayBoxSelected]}
                    onPress={() => setSelectedResetDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[brdStyles.dayText, selectedResetDay === day && brdStyles.dayTextSelected]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[cpStyles.saveBtn, { marginTop: spacing.md }]}
              onPress={handleSaveBudgetResetDay}
              activeOpacity={0.85}
            >
              <Text style={cpStyles.saveBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={brdStyles.cancelBtn}
              onPress={() => setShowBudgetResetModal(false)}
              activeOpacity={0.7}
            >
              <Text style={brdStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },

  // Collapsing header
  navBar: {
    height: 46,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[900],
    letterSpacing: -0.3,
  },
  navSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary[200],
  },
  largeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[900],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },

  scrollContent: { paddingBottom: spacing.xl },
  profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.md, marginTop: spacing.xs, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[100] },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary[800], alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { ...typography.body, fontWeight: '600', color: colors.primary[800], fontSize: 16 },
  profileEmail: { ...typography.caption, color: colors.primary[400], marginTop: 2 },
  profileLink: { ...typography.caption, color: colors.primary[500], fontWeight: '500', marginTop: 4 },
  sectionHeader: { ...typography.caption, fontWeight: '700', color: colors.primary[500], paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  section: { backgroundColor: colors.white, marginHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[100], overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  rowIconBg: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  rowLabel: { ...typography.body, fontSize: 14, color: colors.primary[700], flex: 1 },
  rowValue: { ...typography.caption, fontSize: 12, color: colors.primary[400], marginRight: spacing.xs },
});

const cpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
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
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[200],
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h3, color: colors.primary[800] },
  subtitle: { ...typography.caption, color: colors.primary[500], marginTop: 2 },

  field: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.label,
    color: colors.primary[600],
    marginBottom: spacing.xs + 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.primary[800],
    paddingVertical: spacing.sm + 4,
    includeFontPadding: false,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger[50],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger[100],
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger[600],
    flex: 1,
  },

  saveBtn: {
    backgroundColor: colors.accent[600],
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
});

const brdStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    alignContent: 'flex-center',
    justifyContent: 'center',
  },
  dayBox: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxSelected: {
    backgroundColor: colors.primary[800],
    borderColor: colors.primary[800],
  },
  dayText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.primary[700],
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    ...typography.body,
    color: colors.primary[500],
    fontSize: 15,
    fontWeight: '500',
  },
});

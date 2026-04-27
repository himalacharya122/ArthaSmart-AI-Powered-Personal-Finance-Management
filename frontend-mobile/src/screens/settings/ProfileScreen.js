/**
 * User Profile — view/edit profile, stats, preferences, delete account.
 */
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import * as authService from '../../services/auth';
import * as txnService from '../../services/transactions';
import { formatCurrencyCompact, formatPercent } from '../../utils/format';
import { storage } from '../../utils/storage';

// Config

const FIELD_CONFIG = [
  { key: 'first_name', label: 'First name', icon: 'person-outline', placeholder: 'First name' },
  { key: 'last_name', label: 'Last name', icon: 'person-outline', placeholder: 'Last name' },
  { key: 'email', label: 'Email', icon: 'email', placeholder: 'email@example.com', editable: false },
  { key: 'phone', label: 'Phone', icon: 'phone', placeholder: '+977 XXXXXXXXXX', keyboardType: 'phone-pad' },
];

const PREFERENCE_CONFIG = [
  { key: 'currency', label: 'Default currency', icon: 'attach-money' },
  { key: 'date_format', label: 'Date format', icon: 'date-range' },
];

const PREF_OPTIONS = {
  currency: {
    label: 'Default Currency',
    options: [
      { value: 'NPR', label: 'NPR — Nepalese Rupee' },
      { value: 'USD', label: 'USD — US Dollar' },
      { value: 'EUR', label: 'EUR — Euro' },
      { value: 'GBP', label: 'GBP — British Pound' },
      { value: 'INR', label: 'INR — Indian Rupee' },
      { value: 'AUD', label: 'AUD — Australian Dollar' },
      { value: 'CAD', label: 'CAD — Canadian Dollar' },
      { value: 'JPY', label: 'JPY — Japanese Yen' },
      { value: 'CNY', label: 'CNY — Chinese Yuan' },
      { value: 'SGD', label: 'SGD — Singapore Dollar' },
    ],
  },
  date_format: {
    label: 'Date Format',
    options: [
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY  (e.g. 26/04/2026)' },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY  (e.g. 04/26/2026)' },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD  (e.g. 2026-04-26)' },
    ],
  },
};

const DEFAULT_PREFS = {
  currency: 'NPR',
  date_format: 'DD/MM/YYYY',
};

// Component

export function ProfileScreen({ navigation, route }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useAppStore((s) => s.showToast);

  // Form state
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
  });
  // Snapshot of form at last load/save — used to detect unsaved changes
  const [originalForm, setOriginalForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Stats
  const [stats, setStats] = useState({ txnCount: 0, totalIncome: 0, totalExpense: 0, savingsRate: 0 });

  // Preferences
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [activePrefModal, setActivePrefModal] = useState(null); // key string | null
  const [tempPrefValue, setTempPrefValue] = useState('');
  const [prefSaving, setPrefSaving] = useState(false);

  // Delete account
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const scrollRef = useRef(null);

  // Has unsaved changes

  const hasChanges =
    originalForm !== null &&
    (form.first_name !== originalForm.first_name ||
      form.last_name !== originalForm.last_name ||
      form.phone !== originalForm.phone);

  // Data loading

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const [profile, expList, incList, expSum, incSum, storedPrefs] = await Promise.all([
            authService.getProfile().catch(() => null),
            txnService.getExpenses({ page_size: 1 }).catch(() => null),
            txnService.getIncomes({ page_size: 1 }).catch(() => null),
            txnService.getExpenseSummary().catch(() => null),
            txnService.getIncomeSummary().catch(() => null),
            storage.getPreferences().catch(() => ({})),
          ]);

          if (profile) {
            const loaded = {
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              email: profile.email || '',
              phone: profile.phone_number || '',
            };
            setForm(loaded);
            setOriginalForm(loaded);
            setUser(profile);

            // Currency comes from backend profile; date_format from AsyncStorage
            setPrefs({
              currency: profile.preferred_currency || storedPrefs?.currency || DEFAULT_PREFS.currency,
              date_format: storedPrefs?.date_format || DEFAULT_PREFS.date_format,
            });
          }

          // Transaction count from paginated list endpoints (summary has no count)
          const txnCount = (expList?.count || 0) + (incList?.count || 0);
          const totalIncome = Number(incSum?.total || 0);
          const totalExpense = Number(expSum?.total || 0);
          const savingsRate =
            totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
          setStats({ txnCount, totalIncome, totalExpense, savingsRate });
        } catch { /* silent */ }
      };

      load();

      if (route?.params?.scrollToDelete) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
      }
    }, [route?.params?.scrollToDelete, setUser]),
  );

  // Profile save

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: form.phone || undefined,
      });
      setUser(updated);
      const newOriginal = {
        first_name: updated.first_name || '',
        last_name: updated.last_name || '',
        email: updated.email || '',
        phone: updated.phone_number || '',
      };
      setOriginalForm(newOriginal);
      setForm(newOriginal);
      showToast('Profile updated!', 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to update profile';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Preferences

  const openPrefModal = (key) => {
    setTempPrefValue(prefs[key]);
    setActivePrefModal(key);
  };

  const handlePrefSave = async () => {
    if (!activePrefModal) return;
    setPrefSaving(true);
    try {
      const key = activePrefModal;
      const value = tempPrefValue;

      // Currency is backed by the server; others are AsyncStorage-only
      if (key === 'currency') {
        const updated = await authService.updateProfile({ preferred_currency: value });
        setUser(updated);
      }

      // Persist to AsyncStorage (all preferences)
      const current = await storage.getPreferences().catch(() => ({}));
      await storage.setPreferences({ ...current, [key]: value });

      setPrefs((prev) => ({ ...prev, [key]: value }));
      setActivePrefModal(null);
      showToast(`${PREF_OPTIONS[key].label} updated`, 'success');
    } catch {
      showToast('Failed to save preference. Try again.', 'error');
    } finally {
      setPrefSaving(false);
    }
  };

  // Delete account

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await authService.deleteAccount();
      showToast('Account deleted', 'info');
      await logout();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to delete account. Please try again.', 'error');
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  // Render

  const initials =
    `${(form.first_name || '')[0] || ''}${(form.last_name || '')[0] || ''}`.toUpperCase() || 'U';

  const activePrefConfig = activePrefModal ? PREF_OPTIONS[activePrefModal] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving}
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.avatarName}>{form.first_name} {form.last_name}</Text>
            <Text style={styles.avatarEmail}>{form.email}</Text>
          </View>

          {/* Personal Info */}
          <Text style={styles.sectionLabel}>PERSONAL INFO</Text>
          <View style={styles.section}>
            {FIELD_CONFIG.map((field, idx) => (
              <View
                key={field.key}
                style={[styles.fieldRow, idx === FIELD_CONFIG.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={styles.fieldInputRow}>
                  <MaterialIcons
                    name={field.icon}
                    size={18}
                    color={field.editable === false ? colors.primary[300] : colors.primary[400]}
                    style={styles.fieldIcon}
                  />
                  <TextInput
                    style={[
                      styles.fieldInput,
                      field.editable === false && styles.fieldInputDisabled,
                    ]}
                    value={form[field.key]}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, [field.key]: text }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.primary[300]}
                    editable={field.editable !== false}
                    keyboardType={field.keyboardType || 'default'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    includeFontPadding={false}
                    textAlignVertical="center"
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Preferences */}
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.section}>
            {PREFERENCE_CONFIG.map((pref, idx) => (
              <TouchableOpacity
                key={pref.key}
                style={[styles.prefRow, idx === PREFERENCE_CONFIG.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => openPrefModal(pref.key)}
                activeOpacity={0.6}
              >
                <View style={styles.prefLeft}>
                  <View style={styles.prefIconBg}>
                    <MaterialIcons name={pref.icon} size={16} color={colors.primary[600]} />
                  </View>
                  <Text style={styles.prefLabel}>{pref.label}</Text>
                </View>
                <View style={styles.prefRight}>
                  <Text style={styles.prefValue}>{prefs[pref.key]}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.primary[400]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Your Stats */}
          <Text style={styles.sectionLabel}>YOUR STATS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.txnCount}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.accent[600] }]}>
                {formatCurrencyCompact(stats.totalIncome, prefs.currency)}
              </Text>
              <Text style={styles.statLabel}>Total Income</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.danger[500] }]}>
                {formatCurrencyCompact(stats.totalExpense, prefs.currency)}
              </Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={styles.statCard}>
              <Text
                style={[
                  styles.statValue,
                  { color: stats.savingsRate >= 0 ? colors.accent[600] : colors.danger[500] },
                ]}
              >
                {formatPercent(stats.savingsRate)}
              </Text>
              <Text style={styles.statLabel}>Savings Rate</Text>
            </View>
          </View>

          {/* Delete Account */}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteModalVisible(true)}>
            <MaterialIcons name="delete-forever" size={18} color={colors.danger[500]} />
            <Text style={styles.deleteBtnText}>Delete account</Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Preference Picker Modal */}
      <Modal
        visible={activePrefModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePrefModal(null)}
      >
        <Pressable style={prefStyles.overlay} onPress={() => setActivePrefModal(null)}>
          <Pressable style={prefStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={prefStyles.handle} />

            {/* Header */}
            <View style={prefStyles.header}>
              <Text style={prefStyles.title}>{activePrefConfig?.label}</Text>
              <TouchableOpacity onPress={() => setActivePrefModal(null)}>
                <MaterialIcons name="close" size={22} color={colors.primary[400]} />
              </TouchableOpacity>
            </View>

            {/* Options list */}
            <ScrollView
              style={prefStyles.optionsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {activePrefConfig?.options.map((opt) => {
                const selected = tempPrefValue === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[prefStyles.optionRow, selected && prefStyles.optionRowSelected]}
                    onPress={() => setTempPrefValue(opt.value)}
                    activeOpacity={0.6}
                  >
                    <Text style={[prefStyles.optionLabel, selected && prefStyles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <MaterialIcons name="check" size={18} color={colors.accent[600]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Save button */}
            <TouchableOpacity
              style={[prefStyles.saveBtn, prefSaving && { opacity: 0.7 }]}
              onPress={handlePrefSave}
              disabled={prefSaving}
              activeOpacity={0.85}
            >
              {prefSaving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={prefStyles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setDeleteConfirmText('');
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setDeleteModalVisible(false);
              setDeleteConfirmText('');
            }}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <View style={styles.deleteIconBg}>
                <MaterialIcons name="delete-outline" size={28} color={colors.danger[600]} />
              </View>
              <Text style={styles.modalTitle}>Delete your account?</Text>
              <Text style={styles.modalDesc}>
                This permanently removes your profile, all transactions, receipts and AI history.
                This cannot be undone. Your data will be erased within 30 days.
              </Text>
              <Text style={styles.modalFieldLabel}>TYPE DELETE TO CONFIRM</Text>
              <TextInput
                style={styles.modalInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE"
                placeholderTextColor={colors.primary[300]}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleteConfirmText !== 'DELETE' && { opacity: 0.5 }]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
              >
                <Text style={styles.deleteConfirmText}>
                  {deleting ? 'Deleting...' : 'Yes, delete my account'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelDeleteBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                }}
              >
                <Text style={styles.cancelDeleteText}>Cancel — keep my account</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Styles

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  // Header
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3 },
  saveBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  saveBtnDisabled: {
    backgroundColor: colors.primary[400],
  },
  saveBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[800],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '700' },
  avatarName: { ...typography.h3, marginBottom: 2 },
  avatarEmail: { ...typography.bodySmall, color: colors.primary[500] },

  // Sections
  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    overflow: 'hidden',
  },

  // Fields
  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[50],
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.primary[500],
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldIcon: {
    marginRight: spacing.sm,
    alignSelf: 'center',
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary[800],
    paddingVertical: 4,
  },
  fieldInputDisabled: { color: colors.primary[400] },

  // Preferences
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[50],
  },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prefIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefLabel: { ...typography.body, fontSize: 14, color: colors.primary[700] },
  prefRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  prefValue: { ...typography.bodySmall, color: colors.primary[400] },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
  },
  statValue: { ...typography.h3, fontSize: 20, color: colors.primary[800], marginBottom: 2 },
  statLabel: { ...typography.caption, color: colors.primary[500] },

  // Delete button
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.danger[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger[100],
  },
  deleteBtnText: { color: colors.danger[500], fontWeight: '600', fontSize: 14 },

  // Delete Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[200],
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  deleteIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h2, fontSize: 22, marginBottom: spacing.sm },
  modalDesc: {
    ...typography.bodySmall,
    color: colors.primary[500],
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalFieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[400],
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  modalInput: {
    ...typography.body,
    fontSize: 16,
    color: colors.danger[600],
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  deleteConfirmBtn: {
    backgroundColor: colors.danger[500],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  deleteConfirmText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  cancelDeleteBtn: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  cancelDeleteText: { color: colors.primary[600], fontWeight: '500', fontSize: 14 },
});

const prefStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[200],
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.primary[800] },

  optionsList: {
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  optionRowSelected: {
    backgroundColor: colors.accent[50],
  },
  optionLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary[700],
  },
  optionLabelSelected: {
    color: colors.accent[700],
    fontWeight: '600',
  },

  saveBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: 16,
  },
});

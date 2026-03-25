/**
 * User Profile, View and edit profile, stats, delete account.
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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import * as authService from '../../services/auth';
import * as txnService from '../../services/transactions';
import { formatCurrencyCompact, formatPercent } from '../../utils/format';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const FIELD_CONFIG = [
  { key: 'first_name', label: 'First name', icon: 'person-outline', placeholder: 'First name' },
  { key: 'last_name', label: 'Last name', icon: 'person-outline', placeholder: 'Last name' },
  { key: 'email', label: 'Email', icon: 'email', placeholder: 'email@example.com', editable: false },
  { key: 'phone', label: 'Phone', icon: 'phone', placeholder: '+977 XXXXXXXXXX', keyboardType: 'phone-pad' },
  { key: 'date_of_birth', label: 'Date of birth', icon: 'cake', placeholder: 'YYYY-MM-DD' },
];

const PREFERENCE_CONFIG = [
  { key: 'currency', label: 'Default currency', icon: 'attach-money', value: 'NPR' },
  { key: 'language', label: 'Language', icon: 'language', value: 'English' },
  { key: 'date_format', label: 'Date format', icon: 'date-range', value: 'DD/MM/YYYY' },
  { key: 'budget_period', label: 'Budget period', icon: 'calendar-today', value: 'Monthly' },
];

export function ProfileScreen({ navigation, route }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useAppStore((s) => s.showToast);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth || '',
  });
  const [stats, setStats] = useState({ txnCount: 0, totalIncome: 0, totalExpense: 0, savingsRate: 0 });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef(null);

  useFocusEffect(useCallback(() => {
    // Fetch latest profile and stats
    const load = async () => {
      try {
        const [profile, expSum, incSum] = await Promise.all([
          authService.getProfile().catch(() => null),
          txnService.getExpenseSummary().catch(() => null),
          txnService.getIncomeSummary().catch(() => null),
        ]);
        if (profile) {
          setForm({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            date_of_birth: profile.date_of_birth || '',
          });
          setUser(profile);
        }
        const totalIncome = Number(incSum?.total || 0);
        const totalExpense = Number(expSum?.total || 0);
        const txnCount = (expSum?.count || 0) + (incSum?.count || 0);
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
        setStats({ txnCount, totalIncome, totalExpense, savingsRate });
      } catch { /* silent */ }
    };
    load();

    // Scroll to delete if requested
    if (route?.params?.scrollToDelete) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
    }
  }, [route?.params?.scrollToDelete, setUser]));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
        date_of_birth: form.date_of_birth || undefined,
      });
      await setUser(updated);
      showToast('Profile updated!', 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to update profile';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await txnService.deleteAccount();
      showToast('Account deleted', 'info');
      await logout();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to delete account', 'error');
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const initials = `${(form.first_name || '')[0] || ''}${(form.last_name || '')[0] || ''}`.toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, saving && { opacity: 0.5 }]}>
            {saving ? 'Saving...' : 'Save changes'}
          </Text>
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
            {FIELD_CONFIG.map((field) => (
              <View key={field.key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <View style={styles.fieldInputRow}>
                  <MaterialIcons name={field.icon} size={18} color={colors.primary[400]} style={{ marginRight: spacing.sm }} />
                  <TextInput
                    style={[styles.fieldInput, field.editable === false && styles.fieldInputDisabled]}
                    value={form[field.key]}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, [field.key]: text }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.primary[300]}
                    editable={field.editable !== false}
                    keyboardType={field.keyboardType || 'default'}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Preferences */}
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.section}>
            {PREFERENCE_CONFIG.map((pref) => (
              <TouchableOpacity key={pref.key} style={styles.prefRow} onPress={() => showToast(`${pref.label}: ${pref.value}`, 'info')}>
                <View style={styles.prefLeft}>
                  <MaterialIcons name={pref.icon} size={18} color={colors.primary[500]} />
                  <Text style={styles.prefLabel}>{pref.label}</Text>
                </View>
                <View style={styles.prefRight}>
                  <Text style={styles.prefValue}>{pref.value}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.primary[400]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Connected Accounts */}
          <Text style={styles.sectionLabel}>CONNECTED ACCOUNTS</Text>
          <View style={styles.section}>
            <View style={styles.connectedRow}>
              <MaterialIcons name="account-circle" size={22} color={colors.primary[500]} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.connectedLabel}>Google account</Text>
                <Text style={styles.connectedDesc}>Not connected</Text>
              </View>
              <TouchableOpacity style={styles.connectBtn}>
                <Text style={styles.connectBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.connectedRow}>
              <MaterialIcons name="verified-user" size={22} color={user?.is_email_verified ? colors.accent[500] : colors.primary[400]} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.connectedLabel}>Email verification</Text>
                <Text style={styles.connectedDesc}>
                  {user?.is_email_verified ? 'Verified' : 'Not verified'}
                </Text>
              </View>
              {!user?.is_email_verified && (
                <TouchableOpacity style={styles.connectBtn}>
                  <Text style={styles.connectBtnText}>Verify</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats */}
          <Text style={styles.sectionLabel}>YOUR STATS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.txnCount}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.accent[600] }]}>{formatCurrencyCompact(stats.totalIncome)}</Text>
              <Text style={styles.statLabel}>Total Income</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.danger[500] }]}>{formatCurrencyCompact(stats.totalExpense)}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: stats.savingsRate >= 0 ? colors.accent[600] : colors.danger[500] }]}>
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

      {/* Delete Account Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="slide" onRequestClose={() => setDeleteModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.deleteIconBg}>
              <MaterialIcons name="delete-outline" size={28} color={colors.danger[600]} />
            </View>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalDesc}>
              This permanently removes your profile, all transactions, receipts and AI history. This cannot be undone. Your data will be erased within 30 days.
            </Text>
            <Text style={styles.modalFieldLabel}>TYPE DELETE TO CONFIRM</Text>
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.primary[300]}
              autoCapitalize="characters"
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
            <TouchableOpacity style={styles.cancelDeleteBtn} onPress={() => { setDeleteModalVisible(false); setDeleteConfirmText(''); }}>
              <Text style={styles.cancelDeleteText}>Cancel — keep my account</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  saveBtn: { backgroundColor: colors.primary[800], borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  saveBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary[800], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '700' },
  avatarName: { ...typography.h3, marginBottom: 2 },
  avatarEmail: { ...typography.bodySmall, color: colors.primary[400] },

  // Sections
  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg },
  section: { backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[100], overflow: 'hidden' },

  // Fields
  fieldRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  fieldLabel: { ...typography.caption, color: colors.primary[400], fontWeight: '500', marginBottom: spacing.xs },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldInput: { flex: 1, ...typography.body, fontSize: 14, color: colors.primary[800], paddingVertical: 2 },
  fieldInputDisabled: { color: colors.primary[400] },

  // Preferences
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prefLabel: { ...typography.body, fontSize: 14, color: colors.primary[700] },
  prefRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  prefValue: { ...typography.bodySmall, color: colors.primary[400] },

  // Connected accounts
  connectedRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  connectedLabel: { ...typography.body, fontSize: 14, color: colors.primary[700] },
  connectedDesc: { ...typography.caption, color: colors.primary[400], marginTop: 1 },
  connectBtn: { borderWidth: 1, borderColor: colors.primary[200], borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  connectBtnText: { ...typography.caption, color: colors.primary[600], fontWeight: '500' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '48%', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[100], alignItems: 'center' },
  statValue: { ...typography.h3, fontSize: 20, color: colors.primary[800], marginBottom: 2 },
  statLabel: { ...typography.caption, color: colors.primary[400] },

  // Delete
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, paddingVertical: spacing.sm + 2, borderWidth: 1, borderColor: colors.danger[200], borderRadius: borderRadius.md, backgroundColor: colors.danger[50] },
  deleteBtnText: { color: colors.danger[500], fontWeight: '600', fontSize: 14 },

  // Delete Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingTop: spacing.md },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.primary[200], alignSelf: 'center', marginBottom: spacing.lg },
  deleteIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.danger[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.h2, fontSize: 22, marginBottom: spacing.sm },
  modalDesc: { ...typography.bodySmall, color: colors.primary[500], lineHeight: 20, marginBottom: spacing.lg },
  modalFieldLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm },
  modalInput: { ...typography.body, fontSize: 16, color: colors.danger[600], fontWeight: '600', borderWidth: 1, borderColor: colors.primary[200], borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.md },
  deleteConfirmBtn: { backgroundColor: colors.danger[500], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 4, alignItems: 'center', marginBottom: spacing.sm },
  deleteConfirmText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  cancelDeleteBtn: { borderWidth: 1, borderColor: colors.primary[200], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  cancelDeleteText: { color: colors.primary[600], fontWeight: '500', fontSize: 14 },
});

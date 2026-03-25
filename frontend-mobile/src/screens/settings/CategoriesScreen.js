/**
 * Manage Categories, Add, edit, remove categories.
 *
 * Features:
 * - Tab switcher: Income / Expense / Budget
 * - Default categories (cannot be deleted, can be renamed)
 * - Custom categories with edit (inline rename) and delete
 * - Add custom category button
 * - Save changes
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CATEGORY_ICONS } from '../../utils/constants';

const TABS = ['Income', 'Expense', 'Budget'];

export function CategoriesScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState('Expense');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const type = activeTab === 'Budget' ? 'expense' : activeTab.toLowerCase();
      const res = await txnService.getCategories(type);
      setCategories(res.results || res || []);
    } catch {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, showToast]);

  useFocusEffect(useCallback(() => {
    fetchCategories();
  }, [fetchCategories]));

  const defaultCats = categories.filter((c) => c.is_default || c.is_system);
  const customCats = categories.filter((c) => !c.is_default && !c.is_system);

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    try {
      await txnService.updateCategory(editingId, { name: editName.trim() });
      setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, name: editName.trim() } : c));
      showToast('Category renamed', 'success');
    } catch {
      showToast('Failed to rename', 'error');
    } finally {
      setEditingId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (cat) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"? Transactions using this category will be set to "Other".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await txnService.deleteCategory(cat.id);
              setCategories((prev) => prev.filter((c) => c.id !== cat.id));
              showToast('Category deleted', 'info');
            } catch {
              showToast('Failed to delete', 'error');
            }
          },
        },
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      const type = activeTab === 'Budget' ? 'expense' : activeTab.toLowerCase();
      const newCat = await txnService.createCategory({ name: newCatName.trim(), type });
      setCategories((prev) => [...prev, newCat]);
      setNewCatName('');
      setShowAddInput(false);
      showToast('Category added!', 'success');
    } catch (err) {
      const msg = err?.response?.data?.name?.[0] || err?.response?.data?.detail || 'Failed to add category';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getCatIcon = (name) => CATEGORY_ICONS[name] || 'label';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage categories</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); setEditingId(null); setShowAddInput(false); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingSpinner message="Loading categories..." />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Info bar */}
          <View style={styles.infoBar}>
            <MaterialIcons name="info-outline" size={16} color={colors.primary[400]} />
            <Text style={styles.infoText}>
              Drag to reorder · tap the pencil to rename · tap the bin to delete. Default categories cannot be deleted.
            </Text>
          </View>

          {/* Default Categories */}
          {defaultCats.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>DEFAULT</Text>
                <Text style={styles.sectionNote}>Cannot be deleted</Text>
              </View>
              {defaultCats.map((cat) => (
                <View key={cat.id} style={styles.catRow}>
                  <MaterialIcons name="drag-indicator" size={18} color={colors.primary[300]} />
                  <View style={styles.catIconBg}>
                    <MaterialIcons name={getCatIcon(cat.name)} size={18} color={colors.primary[600]} />
                  </View>
                  {editingId === cat.id ? (
                    <View style={styles.editInputRow}>
                      <TextInput
                        style={styles.editInput}
                        value={editName}
                        onChangeText={setEditName}
                        autoFocus
                        onSubmitEditing={handleSaveEdit}
                      />
                      <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveEdit}>
                        <MaterialIcons name="check" size={18} color={colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.editCancelBtn} onPress={handleCancelEdit}>
                        <MaterialIcons name="close" size={18} color={colors.primary[500]} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleStartEdit(cat)}>
                        <MaterialIcons name="edit" size={16} color={colors.primary[400]} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </>
          )}

          {/* Custom Categories */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>CUSTOM</Text>
            <Text style={styles.sectionNote}>Drag to reorder</Text>
          </View>
          {customCats.length === 0 && !showAddInput && (
            <Text style={styles.emptyText}>No custom categories yet.</Text>
          )}
          {customCats.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              <MaterialIcons name="drag-indicator" size={18} color={colors.primary[300]} />
              <View style={styles.catIconBg}>
                <MaterialIcons name={getCatIcon(cat.name)} size={18} color={colors.primary[600]} />
              </View>
              {editingId === cat.id ? (
                <View style={styles.editInputRow}>
                  <TextInput
                    style={styles.editInput}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                    onSubmitEditing={handleSaveEdit}
                  />
                  <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveEdit}>
                    <MaterialIcons name="check" size={18} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editCancelBtn} onPress={handleCancelEdit}>
                    <MaterialIcons name="close" size={18} color={colors.primary[500]} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleStartEdit(cat)}>
                    <MaterialIcons name="edit" size={16} color={colors.primary[400]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDelete(cat)}>
                    <MaterialIcons name="delete-outline" size={16} color={colors.danger[400]} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}

          {/* Add New Category Input */}
          {showAddInput ? (
            <View style={styles.addInputRow}>
              <MaterialIcons name="add-circle-outline" size={18} color={colors.primary[400]} />
              <TextInput
                style={styles.addInput}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Category name"
                placeholderTextColor={colors.primary[300]}
                autoFocus
                onSubmitEditing={handleAddCategory}
              />
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleAddCategory} disabled={saving}>
                <MaterialIcons name="check" size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => { setShowAddInput(false); setNewCatName(''); }}>
                <MaterialIcons name="close" size={18} color={colors.primary[500]} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addCatBtn} onPress={() => setShowAddInput(true)}>
              <MaterialIcons name="add" size={20} color={colors.primary[500]} />
              <Text style={styles.addCatBtnText}>Add custom category</Text>
            </TouchableOpacity>
          )}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveChangesBtn} onPress={() => showToast('Categories saved!', 'success')}>
            <Text style={styles.saveChangesBtnText}>Save Changes</Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: colors.primary[100], marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: borderRadius.md, padding: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  tabActive: { backgroundColor: colors.primary[800] },
  tabText: { ...typography.body, fontSize: 14, fontWeight: '500', color: colors.primary[500] },
  tabTextActive: { color: colors.white, fontWeight: '600' },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Info bar
  infoBar: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primary[100], borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  infoText: { ...typography.caption, color: colors.primary[500], flex: 1, lineHeight: 16 },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5 },
  sectionNote: { ...typography.caption, color: colors.primary[300], fontSize: 11 },

  // Category row
  catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.md, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[100], gap: spacing.sm },
  catIconBg: { width: 36, height: 36, borderRadius: borderRadius.sm, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  catName: { ...typography.body, fontSize: 14, color: colors.primary[700], flex: 1, fontWeight: '500' },
  defaultBadge: { backgroundColor: colors.primary[100], borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '600', color: colors.primary[400] },
  editBtn: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  deleteIconBtn: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.danger[50], alignItems: 'center', justifyContent: 'center' },

  // Edit inline
  editInputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editInput: { flex: 1, ...typography.body, fontSize: 14, color: colors.primary[800], borderWidth: 1, borderColor: colors.primary[300], borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, backgroundColor: colors.white },
  editSaveBtn: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.primary[800], alignItems: 'center', justifyContent: 'center' },
  editCancelBtn: { width: 32, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' },

  // Add
  addCatBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  addCatBtnText: { ...typography.body, fontSize: 14, color: colors.primary[500] },
  addInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.primary[200] },
  addInput: { flex: 1, ...typography.body, fontSize: 14, color: colors.primary[800], borderWidth: 1, borderColor: colors.primary[200], borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2 },

  // Save
  saveChangesBtn: { backgroundColor: colors.primary[800], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 4, alignItems: 'center', marginTop: spacing.xl },
  saveChangesBtnText: { color: colors.white, fontWeight: '600', fontSize: 15 },

  emptyText: { ...typography.bodySmall, color: colors.primary[400], paddingVertical: spacing.md, textAlign: 'center' },
});

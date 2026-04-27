import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BottomSheet } from '../../components/common/BottomSheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CATEGORY_ICONS } from '../../utils/constants';
import { storage } from '../../utils/storage';

const TABS = ['Expense', 'Income'];

export function CategoriesScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState('Expense');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Modal state — single modal handles both Add and Rename
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState(null); // 'add' | 'rename'
  const [editorTarget, setEditorTarget] = useState(null); // category being renamed
  const [editorValue, setEditorValue] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);

  const type = activeTab.toLowerCase();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await txnService.getCategories(type);
      const all = res.results || res || [];

      const savedOrder = await storage.getCategoryOrder();
      const orderIds = savedOrder[type];
      const defaults = all.filter((c) => c.is_default || c.is_system);
      let customs = all.filter((c) => !c.is_default && !c.is_system);

      if (orderIds && orderIds.length > 0) {
        const idxMap = {};
        orderIds.forEach((id, i) => { idxMap[id] = i; });
        customs = customs.slice().sort((a, b) => {
          const ia = idxMap[a.id] ?? 9999;
          const ib = idxMap[b.id] ?? 9999;
          return ia - ib;
        });
      }

      setCategories([...defaults, ...customs]);
    } catch {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [type, showToast]);

  useFocusEffect(useCallback(() => {
    fetchCategories();
  }, [fetchCategories]));

  const defaultCats = categories.filter((c) => c.is_default || c.is_system);
  const customCats = categories.filter((c) => !c.is_default && !c.is_system);

  const openRename = (cat) => {
    setEditorMode('rename');
    setEditorTarget(cat);
    setEditorValue(cat.name);
    setEditorOpen(true);
  };

  const openAdd = () => {
    setEditorMode('add');
    setEditorTarget(null);
    setEditorValue('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorMode(null);
    setEditorTarget(null);
    setEditorValue('');
  };

  const handleEditorSave = async () => {
    const name = editorValue.trim();
    if (!name) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    if (editorMode === 'add') {
      const duplicate = categories.some(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        showToast(`A category named '${name}' already exists.`, 'error');
        return;
      }
      setEditorSaving(true);
      try {
        const newCat = await txnService.createCategory({ name, type });
        setCategories((prev) => [...prev, newCat]);
        showToast('Category added!', 'success');
        closeEditor();
      } catch (err) {
        const msg =
          err?.response?.data?.name?.[0] ||
          err?.response?.data?.detail ||
          'Failed to add category';
        showToast(msg, 'error');
      } finally {
        setEditorSaving(false);
      }
      return;
    }

    if (editorMode === 'rename' && editorTarget) {
      // Block renaming to a name another category already has
      const duplicate = categories.some(
        (c) => c.id !== editorTarget.id && c.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        showToast(`A category named '${name}' already exists.`, 'error');
        return;
      }
      setEditorSaving(true);
      try {
        await txnService.updateCategory(editorTarget.id, { name });
        setCategories((prev) =>
          prev.map((c) => (c.id === editorTarget.id ? { ...c, name } : c))
        );
        showToast('Category renamed', 'success');
        closeEditor();
      } catch {
        showToast('Failed to rename', 'error');
      } finally {
        setEditorSaving(false);
      }
    }
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

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    setCategories((prev) => {
      const customs = prev.filter((c) => !c.is_default && !c.is_system);
      const defaults = prev.filter((c) => c.is_default || c.is_system);
      const swapped = [...customs];
      [swapped[index - 1], swapped[index]] = [swapped[index], swapped[index - 1]];
      return [...defaults, ...swapped];
    });
  };

  const handleMoveDown = (index) => {
    const customs = categories.filter((c) => !c.is_default && !c.is_system);
    if (index >= customs.length - 1) return;
    setCategories((prev) => {
      const cs = prev.filter((c) => !c.is_default && !c.is_system);
      const ds = prev.filter((c) => c.is_default || c.is_system);
      const swapped = [...cs];
      [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
      return [...ds, ...swapped];
    });
  };

  const handleSaveOrder = async () => {
    const customs = categories.filter((c) => !c.is_default && !c.is_system);
    try {
      const savedOrder = await storage.getCategoryOrder();
      await storage.setCategoryOrder({ ...savedOrder, [type]: customs.map((c) => c.id) });
      showToast('Category order saved!', 'success');
    } catch {
      showToast('Failed to save order', 'error');
    }
  };

  const getCatIcon = (name) => CATEGORY_ICONS[name] || 'label';

  const editorTitle = editorMode === 'add' ? 'Add custom category' : 'Rename category';
  const editorSubtitle = editorMode === 'add'
    ? `New ${type} category name`
    : `Rename "${editorTarget?.name || ''}"`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage categories</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingSpinner message="Loading categories..." />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {defaultCats.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>DEFAULT</Text>
                  <Text style={styles.sectionNote}>Cannot be deleted</Text>
                </View>
                {defaultCats.map((cat) => (
                  <View key={cat.id} style={styles.catRow}>
                    <View style={styles.catIconBg}>
                      <MaterialIcons name={getCatIcon(cat.name)} size={18} color={colors.primary[600]} />
                    </View>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openRename(cat)}>
                      <MaterialIcons name="edit" size={16} color={colors.primary[500]} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>CUSTOM</Text>
              <Text style={styles.sectionNote}>Use arrows to reorder</Text>
            </View>
            {customCats.length === 0 && (
              <Text style={styles.emptyText}>No custom categories yet.</Text>
            )}
            {customCats.map((cat, index) => (
              <View key={cat.id} style={styles.catRow}>
                <View style={styles.reorderBtns}>
                  <TouchableOpacity
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                  >
                    <MaterialIcons
                      name="keyboard-arrow-up"
                      size={18}
                      color={index === 0 ? colors.primary[300] : colors.primary[500]}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMoveDown(index)}
                    disabled={index === customCats.length - 1}
                    style={[styles.arrowBtn, index === customCats.length - 1 && styles.arrowBtnDisabled]}
                  >
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={18}
                      color={index === customCats.length - 1 ? colors.primary[300] : colors.primary[500]}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.catIconBg}>
                  <MaterialIcons name={getCatIcon(cat.name)} size={18} color={colors.primary[600]} />
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
                <TouchableOpacity style={styles.editBtn} onPress={() => openRename(cat)}>
                  <MaterialIcons name="edit" size={16} color={colors.primary[500]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDelete(cat)}>
                  <MaterialIcons name="delete-outline" size={16} color={colors.danger[500]} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ height: spacing.sm }} />
          </ScrollView>

          {/* Sticky footer — no inputs, so no keyboard interference */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.addCatBtn} onPress={openAdd} activeOpacity={0.7}>
              <MaterialIcons name="add-circle-outline" size={20} color={colors.primary[800]} />
              <Text style={styles.addCatBtnText}>Add custom category</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveChangesBtn} onPress={handleSaveOrder} activeOpacity={0.85}>
              <Text style={styles.saveChangesBtnText}>Save order</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Add / Rename sheet */}
      <BottomSheet visible={editorOpen} onClose={closeEditor}>
        <View style={ms.sheet}>
          <View style={ms.handle} />

              <View style={ms.header}>
                <View style={ms.headerIcon}>
                  <MaterialIcons
                    name={editorMode === 'add' ? 'add-circle-outline' : 'edit'}
                    size={22}
                    color={colors.primary[700]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ms.title}>{editorTitle}</Text>
                  <Text style={ms.subtitle}>{editorSubtitle}</Text>
                </View>
                <TouchableOpacity onPress={closeEditor}>
                  <MaterialIcons name="close" size={22} color={colors.primary[400]} />
                </TouchableOpacity>
              </View>

              <View style={ms.field}>
                <Text style={ms.fieldLabel}>Name</Text>
                <TextInput
                  style={ms.input}
                  value={editorValue}
                  onChangeText={setEditorValue}
                  placeholder="Category name"
                  placeholderTextColor={colors.primary[400]}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleEditorSave}
                  maxLength={40}
                  includeFontPadding={false}
                />
              </View>

              <TouchableOpacity
                style={[ms.saveBtn, editorSaving && { opacity: 0.7 }]}
                onPress={handleEditorSave}
                disabled={editorSaving}
                activeOpacity={0.85}
              >
                {editorSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={ms.saveBtnText}>
                    {editorMode === 'add' ? 'Add category' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
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
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  tabActive: { backgroundColor: colors.accent[600] },
  tabText: { ...typography.body, fontSize: 14, fontWeight: '500', color: colors.primary[800] },
  tabTextActive: { color: colors.white, fontWeight: '600' },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[500] },
  sectionNote: { ...typography.caption, color: colors.primary[400], fontSize: 11, fontWeight: '500' },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing.sm,
  },
  catIconBg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { ...typography.body, fontSize: 14, color: colors.primary[700], flex: 1, fontWeight: '500' },
  defaultBadge: {
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: '600', color: colors.primary[500] },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  reorderBtns: { flexDirection: 'column', alignItems: 'center', gap: 2 },
  arrowBtn: { padding: 2 },
  arrowBtnDisabled: { opacity: 0.4 },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  addCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
  },
  addCatBtnText: { ...typography.body, fontSize: 14, color: colors.primary[800], fontWeight: '600' },

  saveChangesBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  saveChangesBtnText: { color: colors.white, fontWeight: '600', fontSize: 15 },

  emptyText: { ...typography.bodySmall, color: colors.primary[400], paddingVertical: spacing.md, textAlign: 'center' },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
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
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.primary[200], alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h3, color: colors.primary[800] },
  subtitle: { ...typography.caption, color: colors.primary[400], marginTop: 2 },

  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.primary[600], marginBottom: spacing.xs + 2 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    color: colors.primary[800],
    minHeight: 50,
  },

  saveBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: { ...typography.button, color: colors.white, fontSize: 16 },
});

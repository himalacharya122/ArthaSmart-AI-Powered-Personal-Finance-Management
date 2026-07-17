import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import * as txnService from '../../services/transactions';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CATEGORY_ICONS } from '../../utils/constants';
import { storage } from '../../utils/storage';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TABS = ['Expense', 'Income'];

export function CategoriesScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState('Expense');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Inline Editing State
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const itemPositions = useRef({});
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

  const scrollTo = (y) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 60), animated: true });
    }
  };

  const toggleAdd = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isAdding) {
      setIsAdding(false);
      setDraftName('');
    } else {
      setIsAdding(true);
      setEditingId(null);
      setDraftName('');
      setTimeout(() => {
        inputRef.current?.focus();
        if (itemPositions.current['add-row'] != null) {
          scrollTo(itemPositions.current['add-row']);
        }
      }, 250);
    }
  };

  const startEdit = (cat) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingId(cat.id);
    setIsAdding(false);
    setDraftName(cat.name);
    setTimeout(() => {
      inputRef.current?.focus();
      if (itemPositions.current[cat.id] != null) {
        scrollTo(itemPositions.current[cat.id]);
      }
    }, 250);
  };

  const cancelEdit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditingId(null);
    setIsAdding(false);
    setDraftName('');
  };

  const handleSave = async () => {
    const name = draftName.trim();
    if (!name) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isAdding) {
        const duplicate = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          showToast(`'${name}' already exists.`, 'error');
          setSaving(false);
          return;
        }
        const newCat = await txnService.createCategory({ name, type });
        setCategories(prev => [...prev, newCat]);
        showToast('Category added!', 'success');
      } else {
        const duplicate = categories.some(c => c.id !== editingId && c.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          showToast(`'${name}' already exists.`, 'error');
          setSaving(false);
          return;
        }
        await txnService.updateCategory(editingId, { name });
        setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name } : c));
        showToast('Category updated', 'success');
      }
      cancelEdit();
    } catch (err) {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Transactions will be moved to "Other".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await txnService.deleteCategory(cat.id);
              setCategories((prev) => prev.filter((c) => c.id !== cat.id));
              showToast('Deleted', 'info');
            } catch {
              showToast('Failed to delete', 'error');
            }
          },
        },
      ]
    );
  };

  const autoSaveOrder = async (newCats) => {
    const customs = newCats.filter((c) => !c.is_default && !c.is_system);
    try {
      const savedOrder = await storage.getCategoryOrder();
      await storage.setCategoryOrder({ ...savedOrder, [type]: customs.map((c) => c.id) });
    } catch {
      showToast('Failed to save order', 'error');
    }
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategories((prev) => {
      const customs = prev.filter((c) => !c.is_default && !c.is_system);
      const defaults = prev.filter((c) => c.is_default || c.is_system);
      const swapped = [...customs];
      [swapped[index - 1], swapped[index]] = [swapped[index], swapped[index - 1]];
      const final = [...defaults, ...swapped];
      autoSaveOrder(final);
      return final;
    });
  };

  const handleMoveDown = (index) => {
    const customs = categories.filter((c) => !c.is_default && !c.is_system);
    if (index >= customs.length - 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategories((prev) => {
      const cs = prev.filter((c) => !c.is_default && !c.is_system);
      const ds = prev.filter((c) => c.is_default || c.is_system);
      const swapped = [...cs];
      [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
      const final = [...ds, ...swapped];
      autoSaveOrder(final);
      return final;
    });
  };

  const getCatIcon = (name) => CATEGORY_ICONS[name] || 'label';

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
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab(tab);
              cancelEdit();
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingSpinner message="Loading categories..." />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Custom Categories Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>CUSTOM</Text>
              <Text style={styles.sectionNote}>Tap category to rename</Text>
            </View>

            {/* Add Category Row (Always at the top of Custom) */}
            <View onLayout={(e) => { itemPositions.current['add-row'] = e.nativeEvent.layout.y; }}>
              <InlineAddRow
                isExpanded={isAdding}
                onToggle={toggleAdd}
                draft={draftName}
                setDraft={setDraftName}
                onSave={handleSave}
                onCancel={toggleAdd}
                saving={saving}
                inputRef={inputRef}
              />
            </View>

            {customCats.length === 0 && !isAdding ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No custom categories yet.</Text>
              </View>
            ) : (
              customCats.map((cat, index) => (
                <View
                  key={cat.id}
                  onLayout={(e) => { itemPositions.current[cat.id] = e.nativeEvent.layout.y; }}
                >
                  <CategoryItem
                    cat={cat}
                    icon={getCatIcon(cat.name)}
                    isEditing={editingId === cat.id}
                    draft={draftName}
                    setDraft={setDraftName}
                    onEdit={() => startEdit(cat)}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    onDelete={() => handleDelete(cat)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    isFirst={index === 0}
                    isLast={index === customCats.length - 1}
                    saving={saving}
                    inputRef={inputRef}
                    isCustom
                  />
                </View>
              ))
            )}

            {/* Default Categories */}
            {defaultCats.length > 0 && (
              <>
                <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
                  <Text style={styles.sectionLabel}>DEFAULT</Text>
                </View>
                {defaultCats.map((cat) => (
                  <View
                    key={cat.id}
                    onLayout={(e) => { itemPositions.current[cat.id] = e.nativeEvent.layout.y; }}
                  >
                    <CategoryItem
                      cat={cat}
                      icon={getCatIcon(cat.name)}
                      isEditing={editingId === cat.id}
                      draft={draftName}
                      setDraft={setDraftName}
                      onEdit={() => startEdit(cat)}
                      onSave={handleSave}
                      onCancel={cancelEdit}
                      saving={saving}
                      inputRef={inputRef}
                    />
                  </View>
                ))}
              </>
            )}

            <View style={{ height: (isAdding || editingId) ? 250 : spacing.md }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function CategoryItem({
  cat, icon, isEditing, draft, setDraft, onEdit, onSave, onCancel,
  onDelete, onMoveUp, onMoveDown, isFirst, isLast, saving, inputRef, isCustom
}) {
  return (
    <View style={[styles.catCard, isEditing && styles.catCardEditing]}>
      <TouchableOpacity
        style={styles.catRow}
        onPress={onEdit}
        disabled={saving || isEditing}
        activeOpacity={0.7}
      >
        <View style={styles.catIconBg}>
          <MaterialIcons name={icon} size={18} color={colors.primary[600]} />
        </View>

        <View style={styles.catNameWrap}>
          <Text style={[styles.catName, isEditing && styles.catNameEditing]}>{cat.name}</Text>
          {cat.is_default && !isEditing && <Text style={styles.defaultBadge}>Default</Text>}
        </View>

        {!isEditing && isCustom && (
          <View style={styles.customActions}>
            <View style={styles.reorderGroup}>
              <TouchableOpacity onPress={onMoveUp} disabled={isFirst} style={styles.arrowBtn}>
                <MaterialIcons name="keyboard-arrow-up" size={20} color={isFirst ? colors.primary[300] : colors.primary[600]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onMoveDown} disabled={isLast} style={styles.arrowBtn}>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={isLast ? colors.primary[300] : colors.primary[600]} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
              <MaterialIcons name="delete-outline" size={18} color={colors.danger[400]} />
            </TouchableOpacity>
          </View>
        )}

        {!isEditing && !isCustom && (
          <MaterialIcons name="edit" size={16} color={colors.primary[500]} />
        )}
      </TouchableOpacity>

      {isEditing && (
        <View style={styles.editSection}>
          <TextInput
            ref={inputRef}
            style={styles.inlineInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Category name"
            placeholderTextColor={colors.primary[400]}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={onSave}
            editable={!saving}
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onCancel} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function InlineAddRow({ isExpanded, onToggle, draft, setDraft, onSave, onCancel, saving, inputRef }) {
  if (!isExpanded) {
    return (
      <TouchableOpacity style={styles.addPlaceholder} onPress={onToggle} activeOpacity={0.7}>
        <MaterialIcons name="add-circle-outline" size={20} color={colors.accent[600]} />
        <Text style={styles.addPlaceholderText}>Add custom category</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.catCard, { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }]}>
      <View style={styles.editSection}>
        <Text style={styles.addTitle}>NEW CATEGORY</Text>
        <TextInput
          ref={inputRef}
          style={styles.inlineInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Enter name..."
          placeholderTextColor={colors.primary[400]}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onSave}
          editable={!saving}
        />
        <View style={styles.editActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={onSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveText}>Add</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.primary[100],
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[100],
  },
  tabActive: { backgroundColor: colors.accent[600] },
  tabText: { ...typography.body, fontSize: 14, fontWeight: '500', color: colors.primary[800] },
  tabTextActive: { color: colors.white, fontWeight: '600' },

  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[500], letterSpacing: 0.5 },
  sectionNote: { ...typography.caption, color: colors.primary[500], fontWeight: '500' },

  catCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.primary[100], marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  catCardEditing: { backgroundColor: colors.primary[50], borderColor: colors.primary[200] },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  catIconBg: {
    width: 32, height: 32, borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  catNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  catName: { ...typography.body, color: colors.primary[800], fontWeight: '500' },
  catNameEditing: { fontWeight: '700', color: colors.primary[700] },
  defaultBadge: { ...typography.caption, fontSize: 10, fontWeight: '500', color: colors.primary[500], backgroundColor: colors.primary[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: spacing.sm },

  customActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reorderGroup: { flexDirection: 'row', alignItems: 'center' },
  arrowBtn: { padding: 4 },
  deleteBtn: { padding: 4 },

  addPlaceholder: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.primary[200], borderStyle: 'dashed', marginBottom: spacing.sm,
  },
  addPlaceholderText: { ...typography.body, fontSize: 14, color: colors.primary[800], fontWeight: '600' },

  editSection: { padding: spacing.md, paddingTop: spacing.md },
  addTitle: { ...typography.caption, fontWeight: '700', color: colors.primary[500], marginBottom: spacing.sm },
  inlineInput: {
    backgroundColor: colors.white, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primary[200],
    height: 40, paddingHorizontal: spacing.sm, fontSize: 15, color: colors.primary[800], fontWeight: '600', marginBottom: spacing.sm,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, height: 34, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[200] },
  saveBtn: { backgroundColor: colors.primary[800] },
  cancelText: { color: colors.primary[600], fontWeight: '600', fontSize: 13 },
  saveText: { color: colors.white, fontWeight: '600', fontSize: 13 },

  emptyCard: { padding: spacing.xl, alignItems: 'center', backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[100] },
  emptyText: { ...typography.bodySmall, color: colors.primary[400] },
});

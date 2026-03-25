/**
 * ScannerScreen, Receipt scanning hub.
 *
 * - Camera capture (full-screen viewfinder)
 * - Gallery picker
 * - Recent scans list
 * - Guides user through the scan --> review --> save flow
 */
import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme/spacing';
import { SCREEN_NAMES } from '../../utils/constants';
import { formatRelativeDate, formatCurrency } from '../../utils/format';
import { useAppStore } from '../../store/appStore';

// Local receipt storage key
const RECEIPTS_STORAGE_KEY = 'arthasmart_receipts';
let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch { AsyncStorage = null; }

export function ScannerScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [recentScans, setRecentScans] = useState([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [picking, setPicking] = useState(false);

  // Load recent scans from local storage
  const loadRecentScans = useCallback(async () => {
    try {
      if (!AsyncStorage) return;
      const stored = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
      if (stored) {
        const all = JSON.parse(stored);
        setRecentScans(all.slice(0, 10)); // Show latest 10
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingRecents(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadRecentScans(); }, [loadRecentScans]));

  // Camera capture
  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to scan receipts.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate(SCREEN_NAMES.SCAN_PROCESSING, {
          imageUri: result.assets[0].uri,
          source: 'camera',
        });
      }
    } catch (err) {
      showToast('Failed to open camera', 'error');
    }
  };

  // Gallery picker
  const handleGallery = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is needed to select receipt images.');
        setPicking(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate(SCREEN_NAMES.SCAN_PROCESSING, {
          imageUri: result.assets[0].uri,
          source: 'gallery',
        });
      }
    } catch (err) {
      showToast('Failed to open gallery', 'error');
    } finally {
      setPicking(false);
    }
  };

  // Render recent scan item
  const renderRecentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.recentItem}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(SCREEN_NAMES.SCAN_REVIEW, {
        receiptData: item,
        imageUri: item.imageUri,
        isFromHistory: true,
      })}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.recentThumb} />
      ) : (
        <View style={[styles.recentThumb, styles.recentThumbPlaceholder]}>
          <MaterialIcons name="receipt" size={20} color={colors.primary[400]} />
        </View>
      )}
      <View style={styles.recentInfo}>
        <Text style={styles.recentMerchant} numberOfLines={1}>
          {item.merchant || 'Unknown Merchant'}
        </Text>
        <Text style={styles.recentMeta}>
          {item.amount ? formatCurrency(item.amount) : 'No amount'}{' · '}
          {item.savedAt ? formatRelativeDate(item.savedAt) : ''}
        </Text>
      </View>
      <View style={[styles.statusBadge, item.savedAsExpense ? styles.statusSaved : styles.statusPending]}>
        <Text style={[styles.statusText, item.savedAsExpense ? styles.statusSavedText : styles.statusPendingText]}>
          {item.savedAsExpense ? 'Saved' : 'Draft'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.h2}>Scan Receipt</Text>
        {recentScans.length > 0 && (
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate(SCREEN_NAMES.RECEIPTS_HISTORY)}
          >
            <MaterialIcons name="history" size={22} color={colors.primary[600]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scan Area */}
      <View style={styles.scanArea}>
        <View style={styles.scanIllustration}>
          <View style={styles.scanIconCircle}>
            <MaterialIcons name="document-scanner" size={56} color={colors.primary[800]} />
          </View>
          <Text style={styles.scanTitle}>Capture your receipt</Text>
          <Text style={styles.scanSubtitle}>
            Take a photo or choose from gallery.{'\n'}We'll extract the details automatically.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryAction} activeOpacity={0.8} onPress={handleCamera}>
            <View style={styles.primaryActionIcon}>
              <MaterialIcons name="photo-camera" size={28} color={colors.white} />
            </View>
            <Text style={styles.primaryActionLabel}>Camera</Text>
            <Text style={styles.primaryActionHint}>Take a photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.8} onPress={handleGallery}>
            <View style={styles.secondaryActionIcon}>
              <MaterialIcons name="photo-library" size={28} color={colors.primary[800]} />
            </View>
            <Text style={styles.secondaryActionLabel}>Gallery</Text>
            <Text style={styles.secondaryActionHint}>Choose image</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <MaterialIcons name="lightbulb-outline" size={18} color={colors.warning[500]} />
          <Text style={styles.tipsText}>
            For best results: good lighting, flat surface, entire receipt visible
          </Text>
        </View>
      </View>

      {/* Recent Scans */}
      <View style={styles.recentsSection}>
        <View style={styles.recentsHeader}>
          <Text style={styles.recentsTitle}>Recent Scans</Text>
          {recentScans.length > 3 && (
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.RECEIPTS_HISTORY)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingRecents ? (
          <ActivityIndicator size="small" color={colors.primary[400]} style={{ marginTop: spacing.lg }} />
        ) : recentScans.length === 0 ? (
          <View style={styles.emptyRecents}>
            <MaterialIcons name="receipt-long" size={32} color={colors.primary[300]} />
            <Text style={styles.emptyRecentsText}>No receipts scanned yet</Text>
            <Text style={styles.emptyRecentsHint}>Your scanned receipts will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={recentScans.slice(0, 3)}
            keyExtractor={(item) => item.id}
            renderItem={renderRecentItem}
            scrollEnabled={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  historyBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
  },

  // Scan area
  scanArea: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  scanIllustration: { alignItems: 'center', marginBottom: spacing.lg },
  scanIconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  scanTitle: { ...typography.h3, marginBottom: spacing.xs },
  scanSubtitle: { ...typography.bodySmall, textAlign: 'center', lineHeight: 20 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  primaryAction: {
    flex: 1, backgroundColor: colors.primary[800], borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center', ...shadow.md,
  },
  primaryActionIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  primaryActionLabel: { ...typography.button, color: colors.white, marginBottom: 2 },
  primaryActionHint: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  secondaryAction: {
    flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary[200],
  },
  secondaryActionIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary[50],
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  secondaryActionLabel: { ...typography.button, color: colors.primary[800], marginBottom: 2 },
  secondaryActionHint: { fontSize: 11, color: colors.primary[500] },

  // Tips
  tipsCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.warning[50], borderRadius: borderRadius.md,
    padding: spacing.sm + 2, paddingHorizontal: spacing.md,
  },
  tipsText: { ...typography.caption, color: colors.warning[600], flex: 1, lineHeight: 16 },

  // Recents
  recentsSection: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  recentsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recentsTitle: { ...typography.label, fontSize: 14, color: colors.primary[500], textTransform: 'uppercase', letterSpacing: 0.5 },
  viewAllText: { ...typography.buttonSmall, color: colors.accent[600] },

  recentItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: borderRadius.md, padding: spacing.sm + 2, marginBottom: spacing.sm,
    ...shadow.sm,
  },
  recentThumb: { width: 44, height: 44, borderRadius: borderRadius.sm, backgroundColor: colors.primary[100] },
  recentThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  recentInfo: { flex: 1, marginLeft: spacing.sm },
  recentMerchant: { ...typography.body, fontWeight: '600', fontSize: 14 },
  recentMeta: { ...typography.caption, marginTop: 2 },

  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  statusSaved: { backgroundColor: colors.accent[50] },
  statusPending: { backgroundColor: colors.warning[50] },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusSavedText: { color: colors.accent[700] },
  statusPendingText: { color: colors.warning[600] },

  emptyRecents: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyRecentsText: { ...typography.body, color: colors.primary[400], marginTop: spacing.sm },
  emptyRecentsHint: { ...typography.caption, marginTop: spacing.xs },
});

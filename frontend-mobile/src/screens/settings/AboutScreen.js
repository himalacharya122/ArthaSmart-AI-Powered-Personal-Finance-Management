/**
 * About & Version, App info, build info, legal links, support.
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';

const BUILD_INFO = [
  { label: 'VERSION', value: '1.0.0' },
  { label: 'BUILD', value: '#2025.001' },
  { label: 'RELEASED', value: 'Mar 2026' },
];

const LEGAL_ITEMS = [
  { icon: 'privacy-tip', label: 'Privacy policy', desc: 'How we collect and use your data', screen: 'PRIVACY_POLICY' },
  { icon: 'description', label: 'Terms of service', desc: 'Usage rules and conditions', screen: 'TERMS_OF_SERVICE' },
  { icon: 'code', label: 'Open source licences', desc: 'Third-party libraries we use', action: 'licenses' },
  { icon: 'cookie', label: 'Cookie policy', desc: 'What cookies we store and why', action: 'cookies' },
];

const SUPPORT_ITEMS = [
  { icon: 'email', label: 'Contact us', desc: 'arthasmart@tbc.edu.np', action: 'email' },
  { icon: 'bug-report', label: 'Report a bug', desc: 'Help us improve the app', action: 'bug' },
];

export function AboutScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);

  const handlePress = (item) => {
    if (item.screen) {
      navigation.navigate(SCREEN_NAMES[item.screen]);
    } else if (item.action === 'email') {
      Linking.openURL('mailto:arthasmart@tbc.edu.np').catch(() => showToast('Cannot open email client', 'error'));
    } else if (item.action === 'bug') {
      Linking.openURL('mailto:arthasmart@tbc.edu.np?subject=Bug%20Report').catch(() => showToast('Cannot open email client', 'error'));
    } else {
      showToast('Coming soon', 'info');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About & version</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App Logo & Info */}
        <View style={styles.appSection}>
          <View style={styles.appIcon}>
            <MaterialIcons name="account-balance-wallet" size={36} color={colors.white} />
          </View>
          <Text style={styles.appName}>ArthaSmart</Text>
          <Text style={styles.appTagline}>AI-powered personal finance</Text>
          <View style={styles.versionBadge}>
            <View style={styles.versionDot} />
            <Text style={styles.versionText}>Version 1.0.0 · Up to date</Text>
          </View>
        </View>

        {/* Build Info */}
        <Text style={styles.sectionLabel}>BUILD INFO</Text>
        <View style={styles.buildGrid}>
          {BUILD_INFO.map((info, idx) => (
            <View key={info.label} style={[styles.buildCard, idx === 2 && { width: '48%' }]}>
              <Text style={styles.buildCardLabel}>{info.label}</Text>
              <Text style={styles.buildCardValue}>{info.value}</Text>
            </View>
          ))}
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.listSection}>
          {LEGAL_ITEMS.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.listRow} onPress={() => handlePress(item)}>
              <View style={styles.listIconBg}>
                <MaterialIcons name={item.icon} size={18} color={colors.primary[600]} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listLabel}>{item.label}</Text>
                <Text style={styles.listDesc}>{item.desc}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.listSection}>
          {SUPPORT_ITEMS.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.listRow} onPress={() => handlePress(item)}>
              <View style={styles.listIconBg}>
                <MaterialIcons name={item.icon} size={18} color={colors.primary[600]} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listLabel}>{item.label}</Text>
                <Text style={styles.listDesc}>{item.desc}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {'\u00A9'} 2026 ArthaSmart. All rights reserved.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // App section
  appSection: { alignItems: 'center', paddingVertical: spacing.xl },
  appIcon: { width: 72, height: 72, borderRadius: borderRadius.lg, backgroundColor: colors.primary[800], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  appName: { ...typography.h1, fontSize: 26, marginBottom: spacing.xs },
  appTagline: { ...typography.bodySmall, color: colors.primary[400], marginBottom: spacing.md },
  versionBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary[200] },
  versionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent[500] },
  versionText: { ...typography.bodySmall, color: colors.primary[600], fontWeight: '500' },

  sectionLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[400], letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md },

  // Build info
  buildGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buildCard: { width: '48%', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary[200] },
  buildCardLabel: { ...typography.caption, fontWeight: '600', color: colors.primary[400], letterSpacing: 0.3, marginBottom: spacing.xs },
  buildCardValue: { ...typography.h3, fontSize: 18, color: colors.primary[800] },

  // List sections
  listSection: { backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary[100], overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  listIconBg: { width: 36, height: 36, borderRadius: borderRadius.sm, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  listInfo: { flex: 1 },
  listLabel: { ...typography.body, fontSize: 14, color: colors.primary[700], fontWeight: '500' },
  listDesc: { ...typography.caption, color: colors.primary[400], marginTop: 1 },

  // Footer
  footer: { ...typography.caption, color: colors.primary[300], textAlign: 'center', marginTop: spacing.xl },
});

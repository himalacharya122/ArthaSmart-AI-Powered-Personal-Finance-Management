/**
 * Privacy Policy, Full scrollable legal text.
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

const LAST_UPDATED = 'March 2026';

const SECTIONS = [
  {
    title: 'What We Collect',
    icon: 'folder-open',
    items: [
      'Your name, email address, and transaction data you enter.',
      'Device information and usage analytics to improve the app.',
      'AI chat history and insights to personalize your experience.',
    ],
  },
  {
    title: 'How We Use It',
    icon: 'visibility',
    items: [
      'To power AI insights, anomaly detection, and spending reports.',
      'To sync your data across devices securely.',
      'To improve app features and fix bugs.',
      'We never sell your personal data to third parties.',
    ],
  },
  {
    title: 'Data Storage & Security',
    icon: 'lock',
    items: [
      'All data is encrypted at rest and in transit (TLS 1.3).',
      'We use industry-standard cloud infrastructure with regular backups.',
      'Access to production data is restricted to authorized personnel only.',
    ],
  },
  {
    title: 'Your Rights',
    icon: 'gavel',
    items: [
      'You can export all your data at any time (Settings > Export Data).',
      'You can delete your account and all associated data permanently.',
      'You can request a copy of your data by contacting support.',
      'You can opt out of AI-powered insights at any time.',
    ],
  },
  {
    title: 'Third-Party Services',
    icon: 'share',
    items: [
      'Groq Cloud API for AI-powered chat and insights (data processed securely).',
      'Cloud storage for receipt images.',
      'No data is shared with advertisers.',
    ],
  },
  {
    title: 'Contact',
    icon: 'email',
    items: [
      'For privacy-related questions: arthasmart@tbc.edu.np',
      'ArthaSmart — The British College, Kathmandu, Nepal',
    ],
  },
];

export function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        <Text style={styles.intro}>
          We take your financial data seriously. ArthaSmart collects only the minimum information necessary to provide you with AI-powered personal finance management. Here is what you need to know:
        </Text>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name={section.icon} size={18} color={colors.primary[600]} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.items.map((item, iIdx) => (
              <View key={iIdx} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity style={styles.gotItBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.gotItBtnText}>Got it</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  lastUpdated: { ...typography.caption, color: colors.primary[400], marginBottom: spacing.md, fontWeight: '500' },
  intro: { ...typography.body, fontSize: 14, color: colors.primary[600], lineHeight: 22, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.body, fontWeight: '700', color: colors.primary[800], fontSize: 15 },
  bulletRow: { flexDirection: 'row', paddingLeft: spacing.sm, marginBottom: spacing.xs },
  bullet: { color: colors.primary[400], fontSize: 14, marginRight: spacing.sm, lineHeight: 20 },
  bulletText: { ...typography.bodySmall, color: colors.primary[600], lineHeight: 20, flex: 1 },
  gotItBtn: { backgroundColor: colors.primary[800], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 4, alignItems: 'center', marginTop: spacing.md },
  gotItBtnText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});

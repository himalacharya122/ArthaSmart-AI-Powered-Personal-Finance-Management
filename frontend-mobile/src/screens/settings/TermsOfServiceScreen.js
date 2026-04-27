/**
 * Terms of Service — Full scrollable legal text.
 * Reference: terms-of-service-screen.png wireframe
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
    title: '1. Acceptance of Terms',
    content: 'By creating an account or using ArthaSmart, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the app.',
  },
  {
    title: '2. Your Account',
    content: 'You are responsible for maintaining the confidentiality of your credentials. You must provide accurate information when registering. You must be at least 16 years old to use this service.',
  },
  {
    title: '3. Permitted Use',
    content: 'ArthaSmart is provided for personal finance management only. You may not use the app for any illegal activities, attempt to reverse-engineer the AI system, or share your account credentials with others.',
  },
  {
    title: '4. AI-Powered Features',
    content: 'Our AI assistant (Finny) provides suggestions and insights based on your transaction data. These are informational only and do not constitute financial advice. Always consult a qualified financial advisor for major financial decisions.',
  },
  {
    title: '5. Data & Content',
    content: 'You retain ownership of all data you enter into ArthaSmart. By using the app, you grant us a limited license to process your data to provide the service. You can export or delete your data at any time.',
  },
  {
    title: '6. Service Availability',
    content: 'We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance with advance notice. We reserve the right to modify or discontinue features with reasonable notice.',
  },
  {
    title: '7. Limitation of Liability',
    content: 'ArthaSmart is provided "as is" without warranties. We are not liable for any financial decisions made based on AI suggestions. Our total liability shall not exceed the amount you paid for the service in the past 12 months.',
  },
  {
    title: '8. Termination',
    content: 'You may delete your account at any time. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted within 30 days.',
  },
  {
    title: '9. Changes to Terms',
    content: 'We may update these terms from time to time. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.',
  },
  {
    title: '10. Contact',
    content: 'For questions about these terms, contact us at arthasmart@tbc.edu.np. ArthaSmart is developed by students at The British College, Kathmandu, Nepal.',
  },
];

export function TermsOfServiceScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
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
  lastUpdated: { ...typography.caption, color: colors.primary[400], marginBottom: spacing.lg, fontWeight: '500' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.body, fontWeight: '700', color: colors.primary[800], fontSize: 15, marginBottom: spacing.sm },
  sectionContent: { ...typography.body, fontSize: 14, color: colors.primary[600], lineHeight: 22 },
  gotItBtn: { backgroundColor: colors.primary[800], borderRadius: borderRadius.md, paddingVertical: spacing.sm + 4, alignItems: 'center', marginTop: spacing.md },
  gotItBtnText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../theme';

export function TransactionsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={typography.h2}>Transactions</Text>
        <Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>
          Transaction list will be built in Phase 4
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
});

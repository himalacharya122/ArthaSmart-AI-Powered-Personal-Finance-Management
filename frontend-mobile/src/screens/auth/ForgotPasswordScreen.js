import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../theme';

export function ForgotPasswordScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={typography.h1}>Forgot Password</Text>
        <Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>
          Forgot password screen will be built in Phase 2
        </Text>
        <Text
          style={[typography.bodySmall, { color: colors.accent[600], marginTop: spacing.lg }]}
          onPress={() => navigation.goBack()}
        >
          Back to Sign In
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
});

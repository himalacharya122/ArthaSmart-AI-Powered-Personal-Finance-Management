import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';

export function LoginScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={typography.h1}>Welcome Back</Text>
        <Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>
          Login screen will be built in Phase 2
        </Text>
        <Text
          style={[typography.bodySmall, { color: colors.accent[600], marginTop: spacing.lg }]}
          onPress={() => navigation.navigate(SCREEN_NAMES.REGISTER)}
        >
          Don't have an account? Sign up
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
});

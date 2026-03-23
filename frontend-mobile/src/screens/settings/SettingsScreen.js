import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';

export function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h2}>Settings</Text>
      </View>
      <View style={styles.content}>
        <Text style={[typography.bodySmall, { marginBottom: spacing.xl }]}>
          Full settings will be built in Phase 6
        </Text>
        <Button
          title="Logout"
          onPress={logout}
          variant="dangerOutline"
          icon={<MaterialIcons name="logout" size={18} color={colors.danger[500]} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
});

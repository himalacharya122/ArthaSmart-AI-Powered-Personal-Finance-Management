import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing, shadow } from '../../theme/spacing';

export function Card({ children, style, variant = 'default' }) {
  return (
    <View
      style={[
        styles.card,
        variant === 'outlined' && styles.outlined,
        variant === 'elevated' && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  outlined: {
    backgroundColor: colors.transparent,
  },
  elevated: {
    borderWidth: 0,
    ...shadow.md,
  },
});

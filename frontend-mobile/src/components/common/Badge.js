import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

const BADGE_COLORS = {
  default: { bg: colors.primary[100], text: colors.primary[600] },
  accent: { bg: colors.accent[100], text: colors.accent[700] },
  danger: { bg: colors.danger[100], text: colors.danger[600] },
  warning: { bg: colors.warning[100], text: colors.warning[600] },
  info: { bg: colors.info[100], text: colors.info[500] },
};

export function Badge({ label, variant = 'default', style }) {
  const config = BADGE_COLORS[variant] || BADGE_COLORS.default;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

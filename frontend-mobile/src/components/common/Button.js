import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

const VARIANTS = {
  primary: {
    bg: colors.primary[800],
    text: colors.white,
    border: colors.primary[800],
  },
  accent: {
    bg: colors.accent[600],
    text: colors.white,
    border: colors.accent[600],
  },
  outline: {
    bg: colors.transparent,
    text: colors.primary[700],
    border: colors.primary[300],
  },
  ghost: {
    bg: colors.transparent,
    text: colors.primary[600],
    border: colors.transparent,
  },
  danger: {
    bg: colors.danger[500],
    text: colors.white,
    border: colors.danger[500],
  },
  dangerOutline: {
    bg: colors.transparent,
    text: colors.danger[500],
    border: colors.danger[500],
  },
};

const SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13 },
  md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 15 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: v.text, fontSize: s.fontSize },
              icon && { marginLeft: spacing.sm },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: typography.button.fontWeight,
  },
});

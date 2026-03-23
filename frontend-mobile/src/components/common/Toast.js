import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadow } from '../../theme/spacing';
import { useAppStore } from '../../store/appStore';

const TOAST_COLORS = {
  success: { bg: colors.accent[50], border: colors.accent[400], icon: 'check-circle', iconColor: colors.accent[600] },
  error: { bg: colors.danger[50], border: colors.danger[400], icon: 'error', iconColor: colors.danger[500] },
  warning: { bg: colors.warning[50], border: colors.warning[400], icon: 'warning', iconColor: colors.warning[600] },
  info: { bg: colors.info[50], border: colors.info[400], icon: 'info', iconColor: colors.info[500] },
};

export function ToastContainer() {
  const toast = useAppStore((s) => s.toast);
  const hideToast = useAppStore((s) => s.hideToast);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (toast) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [toast]);

  if (!toast) return null;

  const config = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.sm,
          backgroundColor: config.bg,
          borderColor: config.border,
          transform: [{ translateY }],
        },
      ]}
    >
      <MaterialIcons name={config.icon} size={20} color={config.iconColor} />
      <Text style={styles.message} numberOfLines={2}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialIcons name="close" size={18} color={colors.primary[400]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    zIndex: 9999,
    ...shadow.lg,
  },
  message: {
    ...typography.bodySmall,
    color: colors.primary[800],
    flex: 1,
    marginHorizontal: spacing.sm,
  },
});

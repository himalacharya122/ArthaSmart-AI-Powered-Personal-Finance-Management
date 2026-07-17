import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing, shadow } from '../../theme/spacing';
import { useAppStore } from '../../store/appStore';

const TOAST_COLORS = {
  success: { 
    bg: colors.primary[800], 
    border: colors.primary[800], 
    icon: 'check-circle', 
    iconColor: colors.white,
    textColor: colors.white,
    closeColor: colors.white
  },
  error: { 
    bg: colors.danger[200], 
    border: colors.danger[200], 
    icon: 'error', 
    iconColor: colors.danger[500],
    textColor: colors.primary[800],
    closeColor: colors.primary[800]
  },
  warning: { 
    bg: colors.warning[100], 
    border: colors.warning[200], 
    icon: 'warning', 
    iconColor: colors.warning[600],
    textColor: colors.primary[800],
    closeColor: colors.primary[800]
  },
  info: { 
    bg: colors.info[100], 
    border: colors.info[200], 
    icon: 'info', 
    iconColor: colors.info[500],
    textColor: colors.primary[800],
    closeColor: colors.primary[800]
  },
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
      <Text style={[styles.message, { color: config.textColor }]} numberOfLines={2}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialIcons name="close" size={18} color={config.closeColor} />
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
    fontWeight: '500',
    flex: 1,
    marginHorizontal: spacing.sm,
  },
});

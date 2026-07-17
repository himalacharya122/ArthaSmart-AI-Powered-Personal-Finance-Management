/**
 * OfflineBanner: Shows a slim banner when device is offline or has pending syncs.
 *
 * - Red: "No internet connection"
 * - Orange: "X items pending sync" (when back online but queue not empty)
 */
import { Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export function OfflineBanner() {
  const { isConnected, pendingCount } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-50)).current;

  const showBanner = !isConnected || pendingCount > 0;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: showBanner ? 0 : -50,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [showBanner]);

  if (!showBanner) return null;

  const isOffline = !isConnected;
  const bgColor = isOffline ? colors.danger[500] : colors.warning[500];
  const icon = isOffline ? 'cloud-off' : 'sync';
  const text = isOffline
    ? 'No internet connection'
    : `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`;

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bgColor, transform: [{ translateY }] }]}>
      <MaterialIcons name={icon} size={16} color={colors.white} />
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  text: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

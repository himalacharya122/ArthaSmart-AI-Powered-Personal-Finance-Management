import { View, Text, Modal as RNModal, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

export function ConfirmModal({
  visible,
  title,
  message,
  confirmTitle = 'Confirm',
  cancelTitle = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  icon,
  iconColor = colors.primary[600],
  loading = false,
}) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.dialog}>
          {icon && (
            <View style={[styles.iconContainer, { borderColor: iconColor + '30' }]}>
              <MaterialIcons name={icon} size={32} color={iconColor} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <Button
              title={cancelTitle}
              onPress={onCancel}
              variant="outline"
              size="md"
              style={styles.actionButton}
              disabled={loading}
            />
            <Button
              title={confirmTitle}
              onPress={onConfirm}
              variant={confirmVariant}
              size="md"
              style={styles.actionButton}
              loading={loading}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodySmall,
    color: colors.primary[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
});

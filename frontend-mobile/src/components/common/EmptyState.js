/**
 * EmptyState, Reusable empty state component per wireframes.
 *
 * Supports:
 *   - Icon in rounded square (matching wireframe style)
 *   - Title + description
 *   - Primary action button (dark, with optional icon)
 *   - Secondary action button (outline)
 *   - Suggestion prompts (for AI chat first interaction)
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionTitle,
  actionIcon,
  onAction,
  secondaryTitle,
  onSecondary,
  suggestions,
  onSuggestion,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon} size={36} color={colors.primary[300]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}

      {/* Suggestions (for AI chat empty state) */}
      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionItem}
              activeOpacity={0.7}
              onPress={() => onSuggestion?.(s.text)}
            >
              <MaterialIcons name={s.icon || 'emoji-objects'} size={18} color={colors.primary[400]} />
              <Text style={styles.suggestionText}>{s.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Primary action */}
      {actionTitle && onAction && (
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={onAction}>
          {actionIcon && <MaterialIcons name={actionIcon} size={18} color={colors.white} style={{ marginRight: 6 }} />}
          <Text style={styles.primaryBtnText}>{actionTitle}</Text>
        </TouchableOpacity>
      )}

      {/* Secondary action */}
      {secondaryTitle && onSecondary && (
        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={onSecondary}>
          <Text style={styles.secondaryBtnText}>{secondaryTitle}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodySmall,
    color: colors.primary[400],
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },

  // Suggestions
  suggestionsContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionText: {
    ...typography.body,
    fontSize: 14,
    color: colors.primary[700],
  },

  // Primary button
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[800],
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.white,
  },

  // Secondary button
  secondaryBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  secondaryBtnText: {
    ...typography.button,
    color: colors.primary[600],
  },
});

/**
 * Chat History - Full list of all AI conversations.
 * Tap to open a conversation, press New to start one, long-press to delete.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableHighlight,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { SCREEN_NAMES } from '../../utils/constants';
import { formatRelativeDate } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';

export function ChatHistoryScreen({ navigation }) {
  const showToast = useAppStore((s) => s.showToast);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState(null);

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await chatService.getConversations({ ordering: '-updated_at', page_size: 20 });
      setConversations(res.results || []);
      setNextPage(res.next || null);
    } catch {
      if (!isRefresh) showToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { loadConversations(); }, [loadConversations]));

  const loadMore = async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await chatService.getConversations({ ordering: '-updated_at', page_size: 20, cursor: nextPage });
      setConversations((prev) => [...prev, ...(res.results || [])]);
      setNextPage(res.next || null);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const startNewChat = () => {
    navigation.replace(SCREEN_NAMES.AI_CHAT, {});
  };

  const confirmDelete = (conv) => {
    Alert.alert(
      'Delete conversation?',
      `"${conv.title || 'This conversation'}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteConversation(conv.id);
              setConversations((prev) => prev.filter((c) => c.id !== conv.id));
              showToast('Conversation deleted', 'info');
            } catch {
              showToast('Failed to delete', 'error');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item, index }) => {
    const isLast = index === conversations.length - 1;
    const date = item.updated_at || item.last_message_at || item.created_at;
    return (
      <TouchableHighlight
        underlayColor={colors.primary[50]}
        onPress={() => navigation.navigate(SCREEN_NAMES.AI_CHAT, { conversationId: item.id })}
        onLongPress={() => confirmDelete(item)}
        delayLongPress={500}
      >
        <View style={[styles.row, !isLast && styles.rowDivider]}>
          <View style={styles.rowIcon}>
            <MaterialIcons name="chat-bubble-outline" size={18} color={colors.primary[500]} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title || 'New conversation'}
            </Text>
            <Text style={styles.rowMeta}>
              {date ? formatRelativeDate(date) : 'Just now'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.primary[300]} />
        </View>
      </TouchableHighlight>
    );
  };

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="chat-bubble-outline" size={32} color={colors.primary[400]} />
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyDesc}>Start a chat with the AI to see your history here.</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={startNewChat} activeOpacity={0.8}>
        <Text style={styles.emptyBtnText}>Start a conversation</Text>
      </TouchableOpacity>
    </View>
  );

  const ListFooter = () =>
    loadingMore ? (
      <ActivityIndicator size="small" color={colors.primary[400]} style={{ marginVertical: spacing.md }} />
    ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat History</Text>
        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={startNewChat}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConversations(true)}
              colors={[colors.accent[600]]}
            />
          }
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            conversations.length > 0 ? (
              <Text style={styles.listHint}>Long-press a conversation to delete it.</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3 },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[800],
    alignItems: 'center',
    justifyContent: 'center',
  },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  emptyContainer: { flexGrow: 1 },

  listHint: {
    ...typography.caption,
    color: colors.primary[400],
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  // Conversation rows inside a grouped card
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...shadow.sm,
  },
  rowDivider: {
    // individual cards already have margin so no extra divider needed
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  rowContent: { flex: 1, marginRight: spacing.sm },
  rowTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary[800],
  },
  rowMeta: {
    ...typography.caption,
    color: colors.primary[400],
    marginTop: 2,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.primary[800],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.body,
    color: colors.primary[400],
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    backgroundColor: colors.primary[800],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  emptyBtnText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '600',
  },
});

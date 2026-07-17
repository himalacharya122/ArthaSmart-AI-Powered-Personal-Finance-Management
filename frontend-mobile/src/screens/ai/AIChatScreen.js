/**
 * AI Chat, Conversation screen with message bubbles, action cards, voice input.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, typography, spacing, borderRadius, shadow } from '../../theme';
import { formatCurrency, formatRelativeDate } from '../../utils/format';
import { SCREEN_NAMES } from '../../utils/constants';
import { useAppStore } from '../../store/appStore';
import * as chatService from '../../services/chat';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

// expo-av
let Audio;
try {
  Audio = require('expo-av').Audio;
} catch {
  Audio = null;
}

/* Gemini-style 4-pointed sparkle logo for Kash AI */
function KashAISparkle({ size = 20 }) {
  const long = size * 0.9;
  const short = size * 0.22;
  const br = short / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={['#34D399', '#0EA5E9']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', width: short, height: long, borderRadius: br }}
      />
      <LinearGradient
        colors={['#0EA5E9', '#34D399']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', width: long, height: short, borderRadius: br }}
      />
    </View>
  );
}

/* Inline bold parser: **text** → bold Text node */
function parseInlineBold(text, baseStyle) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  if (parts.length === 1) return <Text style={baseStyle}>{text}</Text>;
  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={[baseStyle, { fontWeight: '700' }]}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

/* Render AI reply with markdown: **bold**, - bullets, 1. numbered, blank-line spacing */
function MarkdownBubble({ content, textStyle }) {
  const lines = (content || '').split('\n');
  const elements = [];

  lines.forEach((line, i) => {
    if (line.trim() === '') {
      elements.push(<View key={`sp-${i}`} style={{ height: 5 }} />);
      return;
    }
    // Bullet: starts with "- " or "• "
    const bulletMatch = line.match(/^[-•]\s(.+)/);
    if (bulletMatch) {
      elements.push(
        <View key={`b-${i}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
          <Text style={[textStyle, { marginRight: 6 }]}>•</Text>
          <View style={{ flex: 1 }}>{parseInlineBold(bulletMatch[1], textStyle)}</View>
        </View>
      );
      return;
    }
    // Numbered list: "1. text"
    const numMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numMatch) {
      elements.push(
        <View key={`n-${i}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
          <Text style={[textStyle, { marginRight: 6, minWidth: 20 }]}>{numMatch[1]}.</Text>
          <View style={{ flex: 1 }}>{parseInlineBold(numMatch[2], textStyle)}</View>
        </View>
      );
      return;
    }
    // Normal paragraph line
    elements.push(
      <View key={`p-${i}`} style={{ marginBottom: 2 }}>
        {parseInlineBold(line, textStyle)}
      </View>
    );
  });

  return <View>{elements}</View>;
}

/* Human-readable label for action types */
const ACTION_LABELS = {
  create_expense: 'Log Expense',
  create_income: 'Log Income',
  update_expense: 'Update Expense',
  update_income: 'Update Income',
  delete_expense: 'Delete Expense',
  delete_income: 'Delete Income',
};

export function AIChatScreen({ navigation, route }) {
  // convId starts from route params but can be set lazily on first send
  const [convId, setConvId] = useState(route?.params?.conversationId ?? null);
  const showToast = useAppStore((s) => s.showToast);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const [convTitle, setConvTitle] = useState('Kash AI');
  const [menuVisible, setMenuVisible] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const flatListRef = useRef(null);

  // Load recent conversations for the empty state
  useEffect(() => {
    chatService.getConversations({ ordering: '-updated_at', page_size: 4 })
      .then((res) => setRecentChats(res.results || []))
      .catch(() => {});
  }, []);

  // Load conversation history (only runs once on mount; convId may be null for new chats)
  useEffect(() => {
    const id = route?.params?.conversationId;
    if (!id) { setLoadingChat(false); return; }
    chatService.getConversation(id)
      .then((conv) => {
        setMessages(conv.messages || []);
        if (conv.title) setConvTitle(conv.title);
      })
      .catch(() => showToast('Failed to load conversation', 'error'))
      .finally(() => setLoadingChat(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  /* Send Message */
  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    // Lazy-create conversation the first time a message is sent
    let currentConvId = convId;
    if (!currentConvId) {
      try {
        const conv = await chatService.createConversation();
        currentConvId = conv.id;
        setConvId(currentConvId);
      } catch {
        showToast('Failed to start conversation', 'error');
        return;
      }
    }

    const tempUserMsg = { id: `temp-${Date.now()}`, role: 'user', content: msg, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const res = await chatService.sendMessage(currentConvId, msg);
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        const newMsgs = [];
        if (res.user_message) newMsgs.push(res.user_message);
        if (res.assistant_message) newMsgs.push(res.assistant_message);
        return [...withoutTemp, ...newMsgs];
      });
      scrollToEnd();
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.error || 'Failed to send message';
      showToast(errMsg, 'error');
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  };

  /* Voice Recording (expo-av) */
  const startRecording = async () => {
    if (!Audio) {
      showToast('Audio not available on this device', 'error');
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        showToast('Microphone permission required', 'error');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      console.warn('Recording error:', err);
      showToast('Failed to start recording', 'error');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        const res = await chatService.transcribeVoice(uri);
        const text = res?.text || res?.transcription || '';
        if (text.trim()) {
          setInput(text.trim());
          showToast('Voice transcribed!', 'success');
        } else {
          showToast('Could not transcribe audio', 'info');
        }
      }
    } catch (err) {
      showToast('Transcription failed', 'error');
    } finally {
      setTranscribing(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /* Actions */
  const handleConfirm = async (messageId) => {
    try {
      const res = await chatService.confirmAction(convId, messageId);
      setMessages((prev) => prev.map((m) => m.id === messageId ? (res.message || m) : m));
      showToast('Action confirmed!', 'success');
    } catch {
      showToast('Failed to confirm action', 'error');
    }
  };

  const handleReject = async (messageId) => {
    try {
      const res = await chatService.rejectAction(convId, messageId);
      setMessages((prev) => prev.map((m) => m.id === messageId ? (res.message || m) : m));
      showToast('Action cancelled', 'info');
    } catch {
      showToast('Failed to cancel action', 'error');
    }
  };

  /* Menu Actions */
  const handleNewChat = () => {
    setMenuVisible(false);
    navigation.push(SCREEN_NAMES.AI_CHAT, {});
  };

  const handleDeleteConversation = () => {
    setMenuVisible(false);
    // Nothing to delete if conversation was never created
    if (!convId) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this entire conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteConversation(convId);
              showToast('Conversation deleted', 'info');
              navigation.goBack();
            } catch {
              showToast('Failed to delete', 'error');
            }
          },
        },
      ]
    );
  };

  const handleClearChat = () => {
    setMenuVisible(false);
    Alert.alert(
      'Clear Chat',
      'Clear all messages from this view? (Messages are still stored on the server)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setMessages([]),
        },
      ]
    );
  };

  /* Render Message */
  const renderMessage = ({ item: msg }) => {
    const isUser = msg.role === 'user';
    const time = msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : '';
    const actions = msg.entities?.actions || [];
    const actionStatus = msg.entities?.action_status;
    const isPending = actionStatus === 'pending';
    const isConfirmed = actionStatus === 'confirmed';
    const isRejected = actionStatus === 'rejected';

    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <KashAISparkle size={15} />
          </View>
        )}

        <View style={styles.msgCol}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
            {isUser ? (
              <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{msg.content}</Text>
            ) : (
              <MarkdownBubble content={msg.content} textStyle={styles.bubbleText} />
            )}
          </View>

          {!isUser && actions.length > 0 && (
            <View style={styles.actionCard}>
              {actions.map((action, idx) => {
                const d = action.data || {};
                const label = ACTION_LABELS[action.type] || action.type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const isDelete = action.type?.startsWith('delete_');
                const isUpdate = action.type?.startsWith('update_');
                return (
                  <View key={idx} style={styles.actionTable}>
                    <Text style={[styles.actionCardTitle, isDelete && { color: colors.danger[600] }]}>
                      {label}
                    </Text>
                    {/* Show referenced ID for delete/update so user knows which record */}
                    {(d.expense_id != null) && (
                      <View style={styles.actionRow}>
                        <Text style={styles.actionLabel}>Transaction ID</Text>
                        <Text style={styles.actionValue}>#{d.expense_id}</Text>
                      </View>
                    )}
                    {(d.income_id != null) && (
                      <View style={styles.actionRow}>
                        <Text style={styles.actionLabel}>Transaction ID</Text>
                        <Text style={styles.actionValue}>#{d.income_id}</Text>
                      </View>
                    )}
                    {d.category && (
                      <View style={styles.actionRow}>
                        <Text style={styles.actionLabel}>Category</Text>
                        <Text style={styles.actionValue}>{d.category}</Text>
                      </View>
                    )}
                    {d.amount != null && (
                      <View style={styles.actionRow}>
                        <Text style={styles.actionLabel}>Amount</Text>
                        <Text style={styles.actionValue}>{formatCurrency(d.amount)}</Text>
                      </View>
                    )}
                    {d.date && (
                      <View style={styles.actionRow}>
                        <Text style={styles.actionLabel}>Date</Text>
                        <Text style={styles.actionValue}>{d.date}</Text>
                      </View>
                    )}
                    {d.merchant && (
                      <View style={styles.actionRow}>
                        <Text style={styles.actionLabel}>Merchant</Text>
                        <Text style={styles.actionValue}>{d.merchant}</Text>
                      </View>
                    )}
                    {d.source_name && (
                      <View style={styles.actionRow}>
                        <Text style={styles.actionLabel}>Source</Text>
                        <Text style={styles.actionValue}>{d.source_name}</Text>
                      </View>
                    )}
                    {/* For delete/update: show a note when only an ID was passed (no other fields) */}
                    {(isDelete || isUpdate) && !d.amount && !d.category && !d.merchant && !d.source_name && !d.expense_id && !d.income_id && (
                      <View style={styles.actionRow}>
                        <Text style={[styles.actionLabel, { fontStyle: 'italic' }]}>See message above for details</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {isPending && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(msg.id)}>
                    <Text style={styles.confirmText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleReject(msg.id)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              {isConfirmed && (
                <View style={styles.statusRow}>
                  <MaterialIcons name="check-circle" size={16} color={colors.accent[600]} />
                  <Text style={[styles.statusText, { color: colors.accent[600] }]}>Confirmed</Text>
                </View>
              )}
              {isRejected && (
                <View style={styles.statusRow}>
                  <MaterialIcons name="cancel" size={16} color={colors.primary[400]} />
                  <Text style={[styles.statusText, { color: colors.primary[400] }]}>Cancelled</Text>
                </View>
              )}
            </View>
          )}

          <Text style={[styles.time, isUser && styles.timeUser]}>{time}</Text>
        </View>
      </View>
    );
  };

  if (loadingChat) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading chat..." />
      </SafeAreaView>
    );
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary[700]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <KashAISparkle size={20} />
          </View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>{convTitle}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.moreBtn} onPress={() => setMenuVisible(true)}>
          <MaterialIcons name="more-vert" size={22} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      {/* 3-dot Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleNewChat}>
              <MaterialIcons name="add-comment" size={20} color={colors.primary[600]} />
              <Text style={styles.menuItemText}>New chat</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
              <MaterialIcons name="clear-all" size={20} color={colors.primary[600]} />
              <Text style={styles.menuItemText}>Clear chat</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteConversation}>
              <MaterialIcons name="delete-outline" size={20} color={colors.danger[500]} />
              <Text style={[styles.menuItemText, { color: colors.danger[500] }]}>Delete conversation</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <KashAISparkle size={42} />
              </View>
              <Text style={styles.emptyChatTitle}>Start a conversation</Text>
              <Text style={styles.emptyChatDesc}>Ask about your spending, log transactions, or get financial advice.</Text>
              {recentChats.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentLabel}>RECENT CHATS</Text>
                  {recentChats.map((chat) => (
                    <TouchableOpacity
                      key={chat.id}
                      style={styles.recentItem}
                      onPress={() => navigation.replace(SCREEN_NAMES.AI_CHAT, { conversationId: chat.id })}
                    >
                      <MaterialIcons name="chat-bubble-outline" size={16} color={colors.primary[400]} />
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentTitle} numberOfLines={1}>{chat.title || 'Conversation'}</Text>
                        <Text style={styles.recentTime}>
                          {chat.last_message_at ? formatRelativeDate(chat.last_message_at) : formatRelativeDate(chat.created_at)}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={18} color={colors.primary[300]} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          }
        />

        {/* Typing indicator */}
        {sending && (
          <View style={styles.typingRow}>
            <View style={styles.avatar}>
              <KashAISparkle size={15} />
            </View>
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <ActivityIndicator size="small" color={colors.primary[400]} />
                <Text style={styles.typingLabel}>Kash AI is thinking...</Text>
              </View>
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.primary[400]}
              value={input}
              onChangeText={setInput}
              maxLength={4000}
              editable={!sending && !transcribing}
              returnKeyType="default"
              multiline
              scrollEnabled
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Mic button */}
          <View style={styles.micContainer}>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={handleMicPress}
              disabled={sending || transcribing}
            >
              {transcribing ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <MaterialIcons
                  name={isRecording ? 'stop' : 'mic'}
                  size={20}
                  color={isRecording ? colors.white : colors.primary[600]}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, canSend && styles.sendBtnActive]}
            onPress={() => handleSend()}
            disabled={!canSend}
          >
            <MaterialIcons name="send" size={20} color={canSend ? colors.white : colors.primary[400]} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.primary[100], backgroundColor: colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.xs },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.body, fontWeight: '600', color: colors.primary[800], fontSize: 14, maxWidth: 180 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent[500] },
  onlineText: { ...typography.caption, color: colors.accent[600], fontSize: 11 },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 100 : 60, paddingRight: spacing.md },
  menuContainer: { backgroundColor: colors.white, borderRadius: borderRadius.md, paddingVertical: spacing.xs, minWidth: 200, ...shadow.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  menuItemText: { ...typography.body, fontSize: 14, color: colors.primary[700] },
  menuDivider: { height: 1, backgroundColor: colors.primary[100], marginHorizontal: spacing.sm },

  // Messages
  messageList: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md },
  msgRowUser: { justifyContent: 'flex-end' },
  msgCol: { maxWidth: '78%' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[100], alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs, marginBottom: spacing.xs + 12 },

  // Bubbles
  bubble: { borderRadius: borderRadius.lg, padding: spacing.sm + 4, paddingHorizontal: spacing.md },
  bubbleAI: { backgroundColor: colors.primary[50], borderBottomLeftRadius: borderRadius.sm },
  bubbleUser: { backgroundColor: colors.primary[800], borderBottomRightRadius: borderRadius.sm },
  bubbleText: { ...typography.body, fontSize: 14, color: colors.primary[800], lineHeight: 20 },
  bubbleTextUser: { color: colors.white },

  // Action cards
  actionCard: { backgroundColor: colors.primary[50], borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.xs, borderWidth: 1, borderColor: colors.primary[200] },
  actionCardTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.primary[800], marginBottom: spacing.sm },
  actionTable: { marginBottom: spacing.sm },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  actionLabel: { ...typography.caption, color: colors.primary[400] },
  actionValue: { ...typography.caption, color: colors.primary[700], fontWeight: '500' },
  actionButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  confirmBtn: { flex: 1, backgroundColor: colors.primary[800], borderRadius: borderRadius.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  confirmText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary[300], borderRadius: borderRadius.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  cancelText: { color: colors.primary[600], fontWeight: '600', fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Time
  time: { ...typography.caption, color: colors.primary[400], fontSize: 10, marginTop: 4 },
  timeUser: { textAlign: 'right' },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  typingBubble: { backgroundColor: colors.primary[50], borderRadius: borderRadius.md, padding: spacing.sm + 2, paddingHorizontal: spacing.md },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typingLabel: { ...typography.caption, color: colors.primary[400], fontSize: 11 },

  // Input bar — multiline-aware, fixed vertical padding (tab bar already handles bottom safe area)
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.primary[100], backgroundColor: colors.white, gap: spacing.xs + 2 },
  inputWrapper: { flex: 1 },
  textInput: { ...typography.body, fontSize: 14, color: colors.primary[800], backgroundColor: colors.primary[50], borderRadius: 22, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 7, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: colors.primary[200] },
  micContainer: { alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  micBtnActive: { backgroundColor: colors.danger[500], borderWidth: 2, borderColor: colors.danger[200] },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary[200], alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: colors.primary[800] },

  // Empty
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl * 2 },
  emptyChatIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyChatTitle: { ...typography.h3, marginBottom: spacing.xs },
  emptyChatDesc: { ...typography.bodySmall, color: colors.primary[500], textAlign: 'center', maxWidth: 260 },

  // Recent chats in empty state
  recentSection: { width: '100%', marginTop: spacing.xl, paddingHorizontal: spacing.sm },
  recentLabel: { ...typography.caption, fontWeight: '700', color: colors.primary[500], marginBottom: spacing.sm },
  recentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[50], borderRadius: borderRadius.md, padding: spacing.sm + 2, marginBottom: spacing.xs, gap: spacing.sm },
  recentInfo: { flex: 1 },
  recentTitle: { ...typography.bodySmall, color: colors.primary[700], fontWeight: '500', fontSize: 13 },
  recentTime: { ...typography.caption, color: colors.primary[400], fontSize: 10, marginTop: 1 },
});

import { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Send, Trash2, Bot, User, Loader2 } from 'lucide-react';
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useDeleteConversation,
  useSendMessage,
  useConfirmActions,
  useRejectActions,
} from '@/hooks/useChat';
import { Button } from '@/components/common/Button';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { ActionCard } from '@/components/chat/ActionCard';
import { QuickActions } from '@/components/chat/QuickActions';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { formatRelativeDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Message } from '@/types/chat';

export function ChatPage() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: listLoading } = useConversations();
  const { data: conversation, isLoading: chatLoading } = useConversation(activeId);
  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();
  const sendMsg = useSendMessage();
  const confirmAct = useConfirmActions();
  const rejectAct = useRejectActions();

  const messages = conversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleNewConversation() {
    createConv.mutate(undefined, {
      onSuccess: (conv) => setActiveId(conv.id),
    });
  }

  async function handleSend(text?: string) {
    const content = (text || input).trim();
    if (!content || !activeId || sendMsg.isPending) return;
    setInput('');
    sendMsg.mutate({ conversationId: activeId, content });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuickAction(text: string) {
    if (!activeId) {
      createConv.mutate(undefined, {
        onSuccess: (conv) => {
          setActiveId(conv.id);
          // Small delay to let the state settle before sending
          setTimeout(() => {
            sendMsg.mutate({ conversationId: conv.id, content: text });
          }, 100);
        },
      });
    } else {
      setInput(text);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-primary-200 bg-white">
      {/* Sidebar — conversation list */}
      <div className={cn(
        'flex flex-col border-r border-primary-200 bg-primary-50 transition-all',
        sidebarOpen ? 'w-64 sm:w-72' : 'w-0 overflow-hidden',
        'max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-20',
        !sidebarOpen && 'max-lg:hidden',
      )}>
        <div className="flex items-center justify-between border-b border-primary-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-800">Conversations</h2>
          <Button variant="ghost" onClick={handleNewConversation} loading={createConv.isPending}>
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : !conversations || conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-primary-400">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  'group flex cursor-pointer items-center gap-2 border-b border-primary-100 px-4 py-3 transition-colors',
                  activeId === conv.id ? 'bg-white' : 'hover:bg-primary-100',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-primary-700">
                    {conv.title || `Chat #${conv.id}`}
                  </p>
                  <p className="truncate text-xs text-primary-400">
                    {conv.message_count} messages &middot; {formatRelativeDate(conv.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConv.mutate(conv.id, {
                      onSuccess: () => { if (activeId === conv.id) setActiveId(null); },
                    });
                  }}
                  className="rounded p-1 text-primary-300 opacity-0 hover:bg-danger-50 hover:text-danger-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-primary-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 text-primary-500 hover:bg-primary-100"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
          <Bot className="h-5 w-5 text-accent-600" />
          <div>
            <h2 className="text-sm font-semibold text-primary-800">ArthaSmart AI</h2>
            <p className="text-xs text-primary-400">Your personal finance buddy</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!activeId ? (
            <QuickActions onSelect={handleQuickAction} />
          ) : chatLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : messages.length === 0 ? (
            <QuickActions onSelect={(text) => handleSend(text)} />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  onConfirm={(msgId) => confirmAct.mutate({ conversationId: activeId, messageId: msgId })}
                  onReject={(msgId) => rejectAct.mutate({ conversationId: activeId, messageId: msgId })}
                  isConfirming={confirmAct.isPending}
                  isRejecting={rejectAct.isPending}
                />
              ))}
              {sendMsg.isPending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-100">
                    <Bot className="h-4 w-4 text-accent-600" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-primary-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                      <span className="text-sm text-primary-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {activeId && (
          <div className="border-t border-primary-200 px-4 py-3">
            <div className="flex items-end gap-2">
              <VoiceButton
                onTranscription={(text) => {
                  setInput((prev) => (prev ? prev + ' ' + text : text));
                }}
                disabled={sendMsg.isPending}
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances or log a transaction..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm text-primary-800 placeholder:text-primary-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              <Button
                variant="accent"
                onClick={() => handleSend()}
                disabled={!input.trim() || sendMsg.isPending}
                loading={sendMsg.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Single chat message bubble with optional action card. */
function ChatBubble({
  message,
  onConfirm,
  onReject,
  isConfirming,
  isRejecting,
}: {
  message: Message;
  onConfirm: (messageId: number) => void;
  onReject: (messageId: number) => void;
  isConfirming: boolean;
  isRejecting: boolean;
}) {
  const isUser = message.role === 'user';
  const entities = message.entities;
  const hasActions = entities?.actions && entities.actions.length > 0;
  const actionStatus = entities?.action_status || 'none';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-100">
          <Bot className="h-4 w-4 text-accent-600" />
        </div>
      )}
      <div className={cn('max-w-[75%]', isUser && 'order-first')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary-800 text-white rounded-br-md'
              : 'bg-primary-100 text-primary-800 rounded-bl-md',
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          <p className={cn(
            'mt-1 text-[10px]',
            isUser ? 'text-primary-300' : 'text-primary-400',
          )}>
            {formatRelativeDate(message.created_at)}
          </p>
        </div>

        {/* Action card for assistant messages with CRUD actions */}
        {!isUser && hasActions && entities?.actions && (
          <ActionCard
            actions={entities.actions}
            status={actionStatus}
            results={entities.action_results}
            onConfirm={() => onConfirm(message.id)}
            onReject={() => onReject(message.id)}
            isConfirming={isConfirming}
            isRejecting={isRejecting}
          />
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-200">
          <User className="h-4 w-4 text-primary-600" />
        </div>
      )}
    </div>
  );
}

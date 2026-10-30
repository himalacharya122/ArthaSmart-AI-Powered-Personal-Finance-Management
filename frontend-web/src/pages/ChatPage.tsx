import { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Send, Trash2, Sparkles, User, Loader2, PanelLeft } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      <div className="flex flex-1 relative z-10 gap-0 overflow-hidden bg-white" style={{ borderRadius: '14px', border: '1px solid rgba(9,29,42,0.07)' }}>
        {/* Sidebar — conversation list */}
        <div className={cn(
          'flex flex-col border-r border-[rgba(9,29,42,0.07)] bg-[#F8FAFC] transition-all',
          sidebarOpen ? 'w-64 sm:w-72' : 'w-0 overflow-hidden',
          'max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-20',
          !sidebarOpen && 'max-lg:hidden',
        )}>
          <div className="flex items-center justify-between px-5 h-[72px] bg-primary-950 border-r border-white/5">
            <h2 className="text-[11px] font-[700] tracking-wider uppercase text-white/40">Conversations</h2>
            <button 
              onClick={handleNewConversation} 
              disabled={createConv.isPending}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-primary-950/40 font-medium">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 border-b border-[rgba(9,29,42,0.04)] px-4 py-4 transition-colors',
                    activeId === conv.id ? 'bg-white' : 'hover:bg-white/50',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'truncate text-sm font-semibold',
                      activeId === conv.id ? 'text-primary-950' : 'text-primary-950/70'
                    )}>
                      {conv.title || `Chat #${conv.id}`}
                    </p>
                    <p className="truncate text-[11px] text-primary-950/40 font-medium mt-0.5">
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
                    className="rounded p-1 text-primary-950/30 opacity-0 hover:bg-danger-50 hover:text-danger-500 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex flex-1 flex-col bg-white">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-5 h-[72px] bg-primary-950">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded p-1.5 text-white/50 hover:bg-white/10 transition-colors"
              title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              <PanelLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-[800] text-white tracking-tight">Squirrel AI</h2>
              <p className="text-[11px] font-semibold text-white/40">Your personal finance buddy</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
            {!activeId ? (
              <QuickActions onSelect={handleQuickAction} />
            ) : chatLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : messages.length === 0 ? (
              <QuickActions onSelect={(text) => handleSend(text)} />
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto w-full">
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
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-50">
                      <Sparkles className="h-4 w-4 text-accent-600" />
                    </div>
                    <div className="rounded-2xl rounded-bl-none bg-[#F6F7F9] px-5 py-3.5 border border-[rgba(9,29,42,0.05)]">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
                        <span className="text-sm font-medium text-primary-950/60">Squirrel is thinking...</span>
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
            <div className="border-t border-[rgba(9,29,42,0.07)] px-6 py-5">
              <div className="max-w-4xl mx-auto flex items-end gap-3">
                <VoiceButton
                  onTranscription={(text) => {
                    setInput((prev) => (prev ? prev + ' ' + text : text));
                  }}
                  disabled={sendMsg.isPending}
                />
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your finances or log a transaction..."
                    rows={1}
                    className="w-full resize-none rounded-xl border border-[rgba(9,29,42,0.1)] bg-[#F8FAFC] px-5 py-3 text-sm text-primary-950 placeholder:text-primary-950/30 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-0 transition-all font-medium"
                  />
                </div>
                <Button
                  variant="accent"
                  className="rounded-xl h-[44px] px-5"
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
          <Sparkles className="h-4 w-4 text-accent-600" />
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

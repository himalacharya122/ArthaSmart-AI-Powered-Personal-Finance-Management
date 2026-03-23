import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchConversations,
  fetchConversation,
  createConversation,
  deleteConversation,
  sendMessage,
  confirmActions,
  rejectActions,
} from '@/api/chat';
import toast from 'react-hot-toast';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => fetchConversation(id!),
    enabled: id !== null,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('Failed to create conversation'),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteConversation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation archived');
    },
    onError: () => toast.error('Failed to archive conversation'),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: number; content: string }) =>
      sendMessage(conversationId, content),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('Failed to send message'),
  });
}

export function useConfirmActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: number; messageId: number }) =>
      confirmActions(conversationId, messageId),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
      // Also refresh financial data since CRUD happened
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['incomes'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      const errors = data.action_results.errors || [];
      if (errors.length > 0) {
        toast.error('Some actions failed');
      } else {
        toast.success('Action confirmed and saved!');
      }
    },
    onError: () => toast.error('Failed to confirm actions'),
  });
}

export function useRejectActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: number; messageId: number }) =>
      rejectActions(conversationId, messageId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
      toast('Action cancelled');
    },
    onError: () => toast.error('Failed to cancel action'),
  });
}

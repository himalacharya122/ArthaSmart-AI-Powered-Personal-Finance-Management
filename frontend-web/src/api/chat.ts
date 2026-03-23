import apiClient from './client';
import type {
  Conversation,
  ConversationDetail,
  SendMessageResponse,
  ConfirmActionResponse,
  Message,
} from '@/types/chat';
import type { PaginatedResponse } from '@/types/api';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await apiClient.get<PaginatedResponse<Conversation>>('/chat/conversations/', {
    params: { page_size: 50 },
  });
  return res.data.results;
}

export async function fetchConversation(id: number): Promise<ConversationDetail> {
  const res = await apiClient.get<ConversationDetail>(`/chat/conversations/${id}/`);
  return res.data;
}

export async function createConversation(title?: string): Promise<Conversation> {
  const res = await apiClient.post<Conversation>('/chat/conversations/', { title });
  return res.data;
}

export async function deleteConversation(id: number): Promise<void> {
  await apiClient.delete(`/chat/conversations/${id}/`);
}

export async function sendMessage(
  conversationId: number,
  content: string,
): Promise<SendMessageResponse> {
  const res = await apiClient.post<SendMessageResponse>(
    `/chat/conversations/${conversationId}/messages/`,
    { content },
  );
  return res.data;
}

export async function confirmActions(
  conversationId: number,
  messageId: number,
): Promise<ConfirmActionResponse> {
  const res = await apiClient.post<ConfirmActionResponse>(
    `/chat/conversations/${conversationId}/messages/${messageId}/confirm/`,
  );
  return res.data;
}

export async function rejectActions(
  conversationId: number,
  messageId: number,
): Promise<{ message: Message }> {
  const res = await apiClient.post<{ message: Message }>(
    `/chat/conversations/${conversationId}/messages/${messageId}/reject/`,
  );
  return res.data;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration_ms: number;
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  const res = await apiClient.post<TranscriptionResult>('/chat/voice/transcribe/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

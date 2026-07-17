/**
 * AI Chat & Insights API service.
 */
import api from './api';

/* Conversations */

export async function getConversations(params = {}) {
  const { data } = await api.get('/api/v1/chat/conversations/', { params });
  return data;
}

export async function getConversation(id) {
  const { data } = await api.get(`/api/v1/chat/conversations/${id}/`);
  return data;
}

export async function createConversation(title = '') {
  const { data } = await api.post('/api/v1/chat/conversations/', { title });
  return data;
}

export async function deleteConversation(id) {
  await api.delete(`/api/v1/chat/conversations/${id}/`);
}

/* Messages */

export async function sendMessage(conversationId, content) {
  const { data } = await api.post(
    `/api/v1/chat/conversations/${conversationId}/messages/`,
    { content }
  );
  return data;
}

export async function confirmAction(conversationId, messageId) {
  const { data } = await api.post(
    `/api/v1/chat/conversations/${conversationId}/messages/${messageId}/confirm/`
  );
  return data;
}

export async function rejectAction(conversationId, messageId) {
  const { data } = await api.post(
    `/api/v1/chat/conversations/${conversationId}/messages/${messageId}/reject/`
  );
  return data;
}

/* Voice */

export async function transcribeVoice(audioUri) {
  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });
  const { data } = await api.post('/api/v1/chat/voice/transcribe/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return data;
}

/* Insights */

export async function getInsights(params = {}) {
  const { data } = await api.get('/api/v1/insights/', { params });
  return data;
}

export async function getInsight(id) {
  const { data } = await api.get(`/api/v1/insights/${id}/`);
  return data;
}

export async function markInsightRead(id) {
  const { data } = await api.post(`/api/v1/insights/${id}/read/`);
  return data;
}

export async function dismissInsight(id) {
  const { data } = await api.post(`/api/v1/insights/${id}/dismiss/`);
  return data;
}

export async function generateInsights() {
  const { data } = await api.post('/api/v1/insights/generate/');
  return data;
}

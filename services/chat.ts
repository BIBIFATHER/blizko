import { ChatMessage } from '../types';

const keyFor = (bookingId: string) => `blizko_chat_${bookingId}`;

export const getChatMessages = (bookingId: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(keyFor(bookingId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveChatMessages = (bookingId: string, messages: ChatMessage[]) => {
  try {
    localStorage.setItem(keyFor(bookingId), JSON.stringify(messages));
  } catch {
    // ignore
  }
};

export const appendChatMessage = (bookingId: string, message: ChatMessage): ChatMessage[] => {
  const next = [...getChatMessages(bookingId), message];
  saveChatMessages(bookingId, next);
  return next;
};

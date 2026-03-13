import { ChatMessage } from '../types';
import { getTmaHeaders } from '../src/core/auth/tma-validate';

const keyFor = (bookingId: string) => `blizko_chat_${bookingId}`;

// ── Anti-disintermediation: contact sharing detection ──────────────────

const PHONE_PATTERNS = [
  /(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,   // +7 (999) 123-45-67
  /\b8\s?9\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b/g,                            // 89991234567
];

const CONTACT_PATTERNS = [
  /@[a-zA-Z0-9_]{3,}/g,                    // @telegram_handle
  /t\.me\/[a-zA-Z0-9_]+/gi,               // t.me/username
  /wa\.me\/\d+/gi,                          // wa.me/79991234567
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // email
];

const SUSPICIOUS_PHRASES_RU = [
  'напрямую', 'без платформы', 'мой номер', 'мой телефон',
  'напишите мне', 'позвоните мне', 'давайте в whatsapp',
  'давайте в телеграм', 'давайте в вотсап', 'вот мой контакт',
  'свяжитесь со мной', 'могу дать номер', 'без комиссии',
  'не через сервис', 'не через приложение',
];

export interface ContactDetectionResult {
  hasContact: boolean;
  type: 'phone' | 'messenger' | 'email' | 'phrase' | null;
  match: string | null;
}

export const detectContactSharing = (text: string): ContactDetectionResult => {
  const lower = text.toLowerCase();

  // Check phone numbers
  for (const pattern of PHONE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return { hasContact: true, type: 'phone', match: match[0] };
  }

  // Check messenger/email
  for (const pattern of CONTACT_PATTERNS) {
    const match = text.match(pattern);
    if (match) return { hasContact: true, type: 'messenger', match: match[0] };
  }

  // Check suspicious phrases
  for (const phrase of SUSPICIOUS_PHRASES_RU) {
    if (lower.includes(phrase)) {
      return { hasContact: true, type: 'phrase', match: phrase };
    }
  }

  return { hasContact: false, type: null, match: null };
};

// Alert admin via Telegram (fire-and-forget)
const alertContactDetected = (bookingId: string, detection: ContactDetectionResult, senderRole: string) => {
  try {
    fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getTmaHeaders() },
      body: JSON.stringify({
        message: `⚠️ Обнаружена попытка обмена контактами!\n\n📋 Бронирование: ${bookingId}\n👤 Отправитель: ${senderRole}\n🔍 Тип: ${detection.type}\n💬 Контент: ${detection.match}\n\nПроверьте чат!`,
      }),
    }).catch(() => { });
  } catch {
    // fire-and-forget
  }
};

// ── Core chat functions ────────────────────────────────────────────────

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

export const appendChatMessage = (bookingId: string, message: ChatMessage): { messages: ChatMessage[]; detection: ContactDetectionResult } => {
  const detection = detectContactSharing(message.text);

  // Alert admin if contact detected
  if (detection.hasContact) {
    alertContactDetected(bookingId, detection, message.sender);
  }

  const next = [...getChatMessages(bookingId), message];
  saveChatMessages(bookingId, next);
  return { messages: next, detection };
};

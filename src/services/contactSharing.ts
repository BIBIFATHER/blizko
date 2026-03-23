import { sendToWebhook } from './api';

const PHONE_PATTERNS = [
  /(\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/,
  /\b8\s?9\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b/,
];

const CONTACT_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /@[a-zA-Z0-9_]{3,}/,
  /t\.me\/[a-zA-Z0-9_]+/i,
  /wa\.me\/\d+/i,
];

const SUSPICIOUS_PHRASES_RU = [
  'напрямую',
  'без платформы',
  'мой номер',
  'мой телефон',
  'напишите мне',
  'позвоните мне',
  'давайте в whatsapp',
  'давайте в телеграм',
  'давайте в вотсап',
  'вот мой контакт',
  'свяжитесь со мной',
  'могу дать номер',
  'без комиссии',
  'не через сервис',
  'не через приложение',
];

export interface ContactDetectionResult {
  hasContact: boolean;
  type: 'phone' | 'messenger' | 'email' | 'phrase' | null;
  match: string | null;
}

export function detectContactSharing(text: string): ContactDetectionResult {
  const lower = text.toLowerCase();

  for (const pattern of PHONE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) return { hasContact: true, type: 'phone', match: match[0] };
  }

  for (const pattern of CONTACT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      const type = match[0].includes('@') && !match[0].startsWith('@') ? 'email' : 'messenger';
      return { hasContact: true, type, match: match[0] };
    }
  }

  for (const phrase of SUSPICIOUS_PHRASES_RU) {
    if (lower.includes(phrase)) {
      return { hasContact: true, type: 'phrase', match: phrase };
    }
  }

  return { hasContact: false, type: null, match: null };
}

export async function notifyContactSharing(params: {
  bookingId: string;
  senderRole: 'family' | 'nanny';
  detection: ContactDetectionResult;
}): Promise<void> {
  const { bookingId, senderRole, detection } = params;
  if (!detection.hasContact) return;

  await sendToWebhook({
    channel: 'telegram',
    event: 'admin.contact_sharing_detected',
    requestId: bookingId,
    message: `⚠️ Обнаружена попытка обмена контактами!\n\n📋 Бронирование: ${bookingId}\n👤 Отправитель: ${senderRole}\n🔍 Тип: ${detection.type}\n💬 Контент: ${detection.match}\n\nПроверьте чат!`,
  });
}
